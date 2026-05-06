var board = null;
var game = new Chess();
var $status = $('#status');

// Таблицы ценности позиций (ИИ будет стремиться захватить центр)
var reverseArray = function(array) { return array.slice().reverse(); };

var pawnEval = [
    [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
    [5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
    [1.0,  1.0,  2.0,  3.0,  3.0,  2.0,  1.0,  1.0],
    [0.5,  0.5,  1.0,  2.5,  2.5,  1.0,  0.5,  0.5],
    [0.0,  0.0,  0.0,  2.0,  2.0,  0.0,  0.0,  0.0],
    [0.5, -0.5, -1.0,  0.0,  0.0, -1.0, -0.5,  0.5],
    [0.5,  1.0, 1.0,  -2.0, -2.0,  1.0,  1.0,  0.5],
    [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
];

var knightEval = [
    [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
    [-4.0, -2.0,  0.0,  0.0,  0.0,  0.0, -2.0, -4.0],
    [-3.0,  0.0,  1.0,  1.5,  1.5,  1.0,  0.0, -3.0],
    [-3.0,  0.5,  1.5,  2.0,  2.0,  1.5,  0.5, -3.0],
    [-3.0,  0.0,  1.5,  2.0,  2.0,  1.5,  0.0, -3.0],
    [-3.0,  0.5,  1.0,  1.5,  1.5,  1.0,  0.5, -3.0],
    [-4.0, -2.0,  0.0,  0.5,  0.5,  0.0, -2.0, -4.0],
    [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
];

// Оценка фигуры в зависимости от её типа и клетки
function getPieceValue(piece, x, y) {
    if (piece === null) return 0;
    var getAbsoluteValue = function (piece, isWhite, x, y) {
        if (piece.type === 'p') return 10 + (isWhite ? pawnEval[y][x] : reverseArray(pawnEval)[y][x]);
        if (piece.type === 'r') return 50;
        if (piece.type === 'n') return 30 + knightEval[y][x];
        if (piece.type === 'b') return 30;
        if (piece.type === 'q') return 90;
        if (piece.type === 'k') return 900;
        throw "Unknown piece type: " + piece.type;
    };
    var absoluteValue = getAbsoluteValue(piece, piece.color === 'w', x, y);
    return piece.color === 'w' ? absoluteValue : -absoluteValue;
}

function evaluateBoard(game) {
    var totalEvaluation = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation = totalEvaluation + getPieceValue(game.board()[i][j], i, j);
        }
    }
    return totalEvaluation;
}

// Алгоритм Минимакс с Альфа-Бета отсечением
function minimax(depth, game, alpha, beta, isMaximisingPlayer) {
    if (depth === 0) return -evaluateBoard(game);

    var newGameMoves = game.moves();

    if (isMaximisingPlayer) {
        var bestEval = -9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            game.move(newGameMoves[i]);
            bestEval = Math.max(bestEval, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer));
            game.undo();
            alpha = Math.max(alpha, bestEval);
            if (beta <= alpha) return bestEval;
        }
        return bestEval;
    } else {
        var bestEval = 9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            game.move(newGameMoves[i]);
            bestEval = Math.min(bestEval, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer));
            game.undo();
            beta = Math.min(beta, bestEval);
            if (beta <= alpha) return bestEval;
        }
        return bestEval;
    }
}

function makeBestMove() {
    var possibleMoves = game.moves();
    if (possibleMoves.length === 0) return;

    var bestMove = null;
    var bestValue = -9999;

    // Глубина 3 — это "средний" уровень. 4 будет думать долго.
    var depth = 3; 

    for (var i = 0; i < possibleMoves.length; i++) {
        var move = possibleMoves[i];
        game.move(move);
        var boardValue = minimax(depth - 1, game, -10000, 10000, false);
        game.undo();
        if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }

    game.move(bestMove);
    board.position(game.fen());
    updateStatus();
}

// --- ВИЗУАЛЬНАЯ ЧАСТЬ И ПОДСВЕТКА ---

function removeGreySquares () {
    $('#my_board .square-55d63').removeClass('highlight-white highlight-black');
}

function greySquare (square) {
    var $square = $('#my_board .square-' + square);
    var background = $square.hasClass('black-3c85d') ? 'highlight-black' : 'highlight-white';
    $square.addClass(background);
}

function onDragStart (source, piece) {
    if (game.game_over() || piece.search(/^b/) !== -1) return false;

    var moves = game.moves({ square: source, verbose: true });
    if (moves.length === 0) return;

    greySquare(source);
    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
}

function onDrop (source, target) {
    removeGreySquares();
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';

    $status.html('ИИ обдумывает стратегию...');
    window.setTimeout(makeBestMove, 250);
}

function onSnapEnd () { board.position(game.fen()); }

function updateStatus() {
    var status = '';
    var moveColor = (game.turn() === 'b') ? 'Черных' : 'Белых';
    if (game.in_checkmate()) status = 'Мат! Победили ' + (game.turn() === 'w' ? 'Черные' : 'Белые');
    else if (game.in_draw()) status = 'Ничья!';
    else {
        status = 'Ваш ход (Белые)';
        if (game.in_check()) status += ' - ШАХ!';
    }
    $status.html(status);
}

board = Chessboard('my_board', {
    draggable: true,
    position: 'start',
    pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
});
updateStatus();