var board = null;
var game = new Chess();
var $status = $('#status-text');
var playerColor = Math.random() < 0.5 ? 'w' : 'b';
var gameOver = false;

// --- POSITION EVALUATION ---
var pawnEval = [
    [0, 0, 0, 0, 0, 0, 0, 0], [5, 5, 5, 5, 5, 5, 5, 5], [1, 1, 2, 3, 3, 2, 1, 1],
    [0.5, 0.5, 1, 2.5, 2.5, 1, 0.5, 0.5], [0, 0, 0, 2, 2, 0, 0, 0],
    [0.5, -0.5, -1, 0, 0, -1, -0.5, 0.5], [0.5, 1, 1, -2, -2, 1, 1, 0.5], [0, 0, 0, 0, 0, 0, 0, 0]
];
var knightEval = [
    [-5, -4, -3, -3, -3, -3, -4, -5], [-4, -2, 0, 0, 0, 0, -2, -4], [-3, 0, 1, 1.5, 1.5, 1, 0, -3],
    [-3, 0.5, 1.5, 2, 2, 1.5, 0.5, -3], [-3, 0, 1.5, 2, 2, 1.5, 0, -3],
    [-3, 0.5, 1, 1.5, 1.5, 1, 0.5, -3], [-4, -2, 0, 0.5, 0.5, 0, -2, -4], [-5, -4, -3, -3, -3, -3, -4, -5]
];

function evaluateBoard(game) {
    const weights = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
    let totalEval = 0;
    game.board().forEach((row, y) => {
        row.forEach((piece, x) => {
            if (piece) {
                let val = weights[piece.type];
                if (piece.type === 'p') val += piece.color === 'w' ? pawnEval[y][x] : pawnEval[7-y][x];
                if (piece.type === 'n') val += knightEval[y][x];
                totalEval += (piece.color === 'w' ? val : -val);
            }
        });
    });
    return totalEval;
}

function minimax(depth, game, alpha, beta, isMax) {
    if (depth === 0 || game.game_over()) return evaluateBoard(game);
    let moves = game.moves();
    if (isMax) {
        let best = -9999;
        for (let m of moves) {
            game.move(m);
            best = Math.max(best, minimax(depth - 1, game, alpha, beta, false));
            game.undo();
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = 9999;
        for (let m of moves) {
            game.move(m);
            best = Math.min(best, minimax(depth - 1, game, alpha, beta, true));
            game.undo();
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

function makeAiMove() {
    if (game.game_over() || gameOver) { updateStatus(); return; }
    
    let moves = game.moves();
    let bestMove = null;
    let bestVal = (game.turn() === 'w') ? -9999 : 9999;

    for (let m of moves) {
        game.move(m);
        let val = minimax(2, game, -10000, 10000, game.turn() === 'w');
        game.undo();
        if (game.turn() === 'w' ? val > bestVal : val < bestVal) {
            bestVal = val;
            bestMove = m;
        }
    }
    game.move(bestMove);
    board.position(game.fen());
    updateStatus();
}

// --- INTERACTION ---
function onDragStart(source, piece) {
    if (game.game_over() || gameOver) return false;
    if (piece.charAt(0) !== game.turn()) return false;
    if (piece.charAt(0) !== playerColor) return false;

    game.moves({square: source, verbose: true}).forEach(m => {
        $('#my_board .square-' + m.to).addClass('highlight-move');
    });
}

function onDrop(source, target) {
    $('#my_board .square-55d63').removeClass('highlight-move');
    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    updateStatus();
    setTimeout(makeAiMove, 300);
}

function updateStatus() {
    let msg = "";
    if (game.in_checkmate()) {
        msg = "Checkmate! " + (game.turn() === 'w' ? "Black" : "White") + " wins.";
        endGame();
    } else if (game.in_draw()) {
        msg = "Draw!";
        endGame();
    } else if (gameOver) {
        msg = "You resigned. AI wins!";
    } else {
        msg = (game.turn() === 'w' ? "White" : "Black") + " to move";
        if (game.in_check()) msg += " (Check!)";
    }
    $status.html(msg);
}

function endGame() {
    gameOver = true;
    $('#resign-btn').hide();
    $('#rematch-btn').show();
}

// --- BUTTONS LOGIC ---
$('#resign-btn').on('click', function() {
    if (!game.game_over() && !gameOver) {
        gameOver = true;
        updateStatus();
        endGame();
    }
});

$('#rematch-btn').on('click', function() {
    // Reset everything
    game = new Chess();
    gameOver = false;
    playerColor = Math.random() < 0.5 ? 'w' : 'b';
    
    board.orientation(playerColor === 'w' ? 'white' : 'black');
    board.start();
    
    $('#rematch-btn').hide();
    $('#resign-btn').show();
    
    updateStatus();
    if (playerColor === 'b') setTimeout(makeAiMove, 500);
});

// --- INITIALIZATION ---
board = Chessboard('my_board', {
    draggable: true,
    position: 'start',
    orientation: playerColor === 'w' ? 'white' : 'black',
    pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: () => board.position(game.fen())
});

if (playerColor === 'b') setTimeout(makeAiMove, 500);
updateStatus();