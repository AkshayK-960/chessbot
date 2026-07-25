var board = null;
var game = new Chess();
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');
var transpositionTable = {};


var pawnTable = [
    [    0,    0,    0,    0,    0,    0,    0,    0 ],
    [   50,   50,   50,   50,   50,   50,   50,   50 ],
    [   10,   10,   20,   30,   30,   20,   10,   10 ],
    [    5,    5,   30,   40,   40,   30,    5,    5 ],
    [    0,    0,    0,   40,   40,    0,    0,    0 ],
    [    5,   -5,  -10,    0,    0,  -10,   -5,    5 ],
    [    5,   10,   10,  -20,  -20,   10,   10,    5 ],
    [    0,    0,    0,    0,    0,    0,    0,    0 ]
];

var knightTable = [
    [  -50,  -20,  -30,  -30,  -30,  -30,  -20,  -50 ],
    [  -40,  -20,    0,    0,    0,    0,  -20,  -40 ],
    [  -30,    0,   10,   15,   15,   10,    0,  -30 ],
    [  -30,    5,   15,   20,   20,   15,    5,  -30 ],
    [  -30,    0,   15,   20,   20,   15,    0,  -30 ],
    [  -30,    5,   10,   15,   15,   10,    5,  -30 ],
    [  -40,  -20,    0,    5,    5,    0,  -20,  -40 ],
    [  -50,  -40,  -30,  -30,  -30,  -30,  -40,  -50 ]
];

var bishopTable = [
    [  -20,  -10,  -10,  -10,  -10,  -10,  -10,  -20 ],
    [  -10,    0,    0,    0,    0,    0,    0,  -10 ],
    [  -10,    0,    5,   10,   10,    5,    0,  -10 ],
    [  -10,    5,    5,   10,   10,    5,    5,  -10 ],
    [  -10,    0,   10,   10,   10,   10,    0,  -10 ],
    [  -10,   10,   10,   10,   10,   10,   10,  -10 ],
    [  -10,    5,    0,    0,    0,    0,    5,  -10 ],
    [  -20,  -10,  -10,  -10,  -10,  -10,  -10,  -20 ]
];

var rookTable = [
    [    0,    0,    0,    0,    0,    0,    0,    0 ],
    [    5,   10,   10,   10,   10,   10,   10,    5 ],
    [   -5,    0,    0,    0,    0,    0,    0,   -5 ],
    [   -5,    0,    0,    0,    0,    0,    0,   -5 ],
    [   -5,    0,    0,    0,    0,    0,    0,   -5 ],
    [   -5,    0,    0,    0,    0,    0,    0,   -5 ],
    [   -5,    0,    0,    0,    0,    0,    0,   -5 ],
    [    0,    0,    0,    5,    5,    0,    0,    0 ]
];

var queenTable = [
    [  -20,  -10,  -10,   -5,   -5,  -10,  -10,  -20 ],
    [  -10,    0,    0,    0,    0,    0,    0,  -10 ],
    [  -10,    0,    5,    5,    5,    5,    0,  -10 ],
    [   -5,    0,    5,    5,    5,    5,    0,   -5 ],
    [    0,    0,    5,    5,    5,    5,    0,   -5 ],
    [  -10,    5,    5,    5,    5,    5,    0,  -10 ],
    [  -10,    0,    5,    0,    0,    0,    0,  -10 ],
    [  -20,  -10,  -10,   -5,   -5,  -10,  -10,  -20 ]
];

var kingTable = [
    [  -30,  -40,  -40,  -50,  -50,  -40,  -40,  -30 ],
    [  -30,  -40,  -40,  -50,  -50,  -40,  -40,  -30 ],
    [  -30,  -40,  -40,  -50,  -50,  -40,  -40,  -30 ],
    [  -30,  -40,  -40,  -50,  -50,  -40,  -40,  -30 ],
    [  -20,  -30,  -30,  -40,  -40,  -30,  -30,  -20 ],
    [  -10,  -20,  -20,  -20,  -20,  -20,  -20,  -10 ],
    [   20,   20,    0,    0,    0,    0,   20,   20 ],
    [   20,   30,   10,    0,    0,   10,   30,   20 ]
];

var psqts = {
    'p' : pawnTable,
    'n' : knightTable,
    'b' : bishopTable,
    'r' : rookTable,
    'q' : queenTable,
    'k' : kingTable
};

var pieceValues = {
    'p' : 100, 
    'n' : 310, 
    'b' : 320,
    'r' : 480,
    'q' : 1000,
    'k' : 60000
};

var scorePieceValues = {'p' : 1, 'n' : 2, 'b' : 3, 'r' : 4, 'q' : 5, 'k' : 6};

var botColor = 'b';
var maxDepth = 3;

function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) return false;

    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop(source, target) {
    var move = game.move({
        from: source, 
        to: target,
        promotion: 'q'
    });

    if (move === null){
        return 'snapback';
    } else {
        window.setTimeout(makeBestMove, 100);
    }
    updateStatus();
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    var status = '';
    var moveColor = 'White';
    if (game.turn() === 'b') {
        moveColor = 'Black';
    }

    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
    } else if (game.in_draw()) {
        status = 'Game over, position is draw';
    } else {
        status = moveColor + ' to move';
        if (game.in_check()) {
            status += ' (King in check)';
        }
    }

    $status.html(status);
    $fen.html(game.fen());
    $pgn.html(game.pgn());
}

var config = {
    draggable: true,
    position: 'start',
    pieceTheme: 'chessboardjs-1.0.0/img/chesspieces/wikipedia/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
};

board = Chessboard('board1', config);
updateStatus();

function makeRandomMove() {
    var possibleMoves = game.moves();

    if(possibleMoves.length === 0) {
        return;
    }

    var randomIdx = Math.floor(Math.random() * possibleMoves.length);
    game.move(possibleMoves[randomIdx]);

    board.position(game.fen());
    updateStatus();
}

function evaluateBoard() {
    var totalEvaluation = 0;
    var boardArr = game.board();

    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            var piece = boardArr[i][j];
            if (piece) {
                var value = pieceValues[piece.type];
                var psqtTable = psqts[piece.type];
                var psqtValue = (piece.color === 'w') ? psqtTable[i][j] : psqtTable[7 - i][j];
                var combinedValue = value + psqtValue;

                totalEvaluation += (piece.color === 'w') ? combinedValue : -combinedValue;
            }
        }
    }
    return totalEvaluation;
}

function makeBestMove() {
    var possibleMoves = game.moves({ verbose : true });
    if(possibleMoves.length === 0) return;

    possibleMoves = orderMoves(possibleMoves);
    
    var bestMove = null;
    var bestValue = (game.turn() === 'b') ? Infinity : -Infinity;

    var alpha = -Infinity;
    var beta = Infinity;

    for(var i = 0; i < possibleMoves.length; i++) {
        var currentMove = possibleMoves[i];

        game.move(currentMove);

        var boardValue = minimax(maxDepth - 1, alpha, beta, game.turn() === 'w');

        game.undo();

        if(game.turn() === 'b') {
            if(boardValue < bestValue) {
                bestValue = boardValue;
                bestMove = currentMove;
            }
            beta = Math.min(beta, bestValue);
        } else {
            if(boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = currentMove;
            }
            alpha = Math.max(alpha, bestValue);
        }
    }

    if(bestMove) {
        game.move(bestMove);

        board.position(game.fen());
        updateStatus();
    }
}

function minimax(depth, alpha, beta, isMaximizingPlayer) {
    var fen = game.fen();

    if(transpositionTable[fen] !== undefined && transpositionTable[fen].depth >= depth) {
        return transpositionTable[fen].score
    }

    if(depth === 0 || game.game_over()) {
        if (game.in_checkmate()) {
            return isMaximizingPlayer ? -999999 + (maxDepth - depth) : 999999 - (maxDepth - depth);
        }
        if (game.in_draw()) {
            return 0;
        }
        return evaluateBoard();
    }

    var possibleMoves = game.moves({ verbose: true });
    possibleMoves = orderMoves(possibleMoves);

    if(isMaximizingPlayer) {
        var bestValue = -Infinity;

        for (var i = 0; i < possibleMoves.length; i++) {
            game.move(possibleMoves[i]);

            bestValue = Math.max(bestValue, minimax(depth - 1, alpha, beta, false));
            game.undo();

            alpha = Math.max(alpha, bestValue);

            if(beta <= alpha) {
                break;
            }
        }
        transpositionTable[fen] = {score: bestValue, depth: depth}
        return bestValue;
    } else {
        var bestValue = Infinity;

        for (var i = 0; i < possibleMoves.length; i++) {
            game.move(possibleMoves[i]);

            bestValue = Math.min(bestValue, minimax(depth - 1, alpha, beta, true));
            game.undo();

            beta = Math.min(beta, bestValue);

            if(beta <= alpha) {
                break;
            }
        }
        return bestValue;
    }
}

function scoreMove(move) {
    var score = 0;

    if (move.captured) {
        var victimValue = scorePieceValues[move.captured];
        var attackerValue = scorePieceValues[move.piece];

        score = 1000 + (victimValue * 10 - attackerValue);
    }

    if(move.promotion) {
        score += 900;
    }

    if (move.san && move.san.indexOf('+') !== -1) {
        score += 50;
    }

    return score;
}

function orderMoves(moves) {
    for (var i = 0; i < moves.length; i++) {
        moves[i].sortScore = scoreMove(moves[i]);
    }
    return moves.sort(function(a, b) {
        return b.sortScore - a.sortScore;
    });
}