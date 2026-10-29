<?php
require_once 'conexao.php';

// Lê os dados enviados em formato JSON pelo JavaScript
$data = json_decode(file_get_contents('php://input'), true);

if (!empty($data['nome']) && isset($data['pontos'])) {
    $nome = trim($data['nome']);
    $pontos = (int)$data['pontos'];
    // Garante que pega o valor de moedas enviado (se não enviado, assume 0)
    $moedas = isset($data['moedas']) ? (int)$data['moedas'] : 0;

    try {
        // 1. Grava no banco de dados incluindo a coluna 'moedas'
        $stmt = $pdo->prepare("
            INSERT INTO ranking (nome, pontos, moedas, data_registro) 
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$nome, $pontos, $moedas]);

        // 2. Procura o TOP 10 atualizado trazendo também a coluna 'moedas'
        $stmtRanking = $pdo->query("
            SELECT id, nome, pontos, moedas, DATE_FORMAT(data_registro, '%d/%m/%Y %H:%i') as data 
            FROM ranking 
            ORDER BY pontos DESC, id ASC 
            LIMIT 10
        ");
        $ranking = $stmtRanking->fetchAll(PDO::FETCH_ASSOC);

        // 3. Retorna a resposta JSON esperada pelo JavaScript
        echo json_encode([
            'status' => 'success',
            'ranking' => $ranking
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Erro ao salvar no banco de dados.'
        ]);
    }
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Dados inválidos fornecidos.'
    ]);
}
?>