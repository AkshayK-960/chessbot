var board = null;
var game = new Chess();
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');

var botColor = 'b';
var maxDepth = 4;

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

function evaluateBoard(boardState) {
    var totalEvaluation = 0;

    var piecevalues = {
        'p' : 10, 
        'n' : 30, 
        'b' : 32,
        'r' : 50,
        'q' : 90,
        'k' : 900
    };

    for(var i = 0; i < 8; i++) {
        for(var j = 0; j < 8; j++) {
            var piece = boardState[i][j];
            if(piece) {
                var value = piecevalues[piece.type];
                totalEvaluation += (piece.color === 'w') ? value : -value;
            }
        }
    }

    return totalEvaluation;
}

function makeBestMove() {
    var possibleMoves = game.moves({ verbose : true });
    if(possibleMoves.length === 0) return;
    
    var bestMove = null;
    var bestValue = (game.turn() === 'b') ? Infinity : -Infinity;

    var alpha = -Infinity;
    var beta = Infinity;

    for(var i = 0; i < possibleMoves.length; i++) {
        var currentMove = possibleMoves[i];

        game.move({
            from: currentMove.from,
            to: currentMove.to,
            promotion: 'q'
        });

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
        game.move({
            from: bestMove.from,
            to: bestMove.to,
            promotion: 'q'
        });

        board.position(game.fen());
        updateStatus();
    }
}

function minimax(depth, alpha, beta, isMaximizingPlayer) {
    if(depth === 0 || game.game_over()) {
        return evaluateBoard(game.board());
    }

    var possibleMoves = game.moves({ verbose: true });

    if(isMaximizingPlayer) {
        var bestValue = -Infinity;

        for (var i = 0; i < possibleMoves.length; i++) {
            game.move({
                from: possibleMoves[i].from,
                to: possibleMoves[i].to,
                promotion: 'q'
            });

            bestValue = Math.max(bestValue, minimax(depth - 1, alpha, beta, false));
            game.undo();

            alpha = Math.max(alpha, bestValue);

            if(beta <= alpha) {
                break;
            }
        }
        return bestValue;
    } else {
        var bestValue = Infinity;

        for (var i = 0; i < possibleMoves.length; i++) {
            game.move({
                from: possibleMoves[i].from,
                to: possibleMoves[i].to,
                promotion: 'q'
            });

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
