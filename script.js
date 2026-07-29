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

    var whiteMaterial = 0;
    var blackMaterial = 0;

    var whitePacks = [];
    var blackPacks = [];

    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            var piece = boardArr[i][j];
            if (piece) {
                var value = pieceValues[piece.type];
                var psqtTable = psqts[piece.type];
                var psqtValue = (piece.color === 'w') ? psqtTable[i][j] : psqtTable[7 - i][j];
                var combinedValue = value + psqtValue;

                if(piece.color === 'w') {
                    totalEvaluation += combinedValue;
                    whiteMaterial += value;
                    if (piece.type === 'p') whitePacks.push({x: i, y: j});
                } else {
                    totalEvaluation -= combinedValue;
                    blackMaterial += value;
                    if (piece.type === 'p') blackPacks.push({x: i, y: j});
                }
            }
        }
    }
    var totalMaterial = whiteMaterial + blackMaterial;
    var isEndgame = totalEvaluation < 4000;

    // add total mobility later ---------------------

    totalEvaluation += evaluatePawns(whitePacks, 'w');
    totalEvaluation -= evaluatePawns(blackPacks, 'b');

    totalEvaluation += evaluateCenterControl(boardArr);

    if(!isEndgame) {
        totalEvaluation += evaluateKingSafety(BoardArr, 'w');
        totalEvaluation += evaluateKingSafety(BoardArr, 'b');
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
        var ttEntry = transpositionTable[fen];
        if(ttEntry.flag === 'EXACT') {
            return ttEntry.score;
        } else if(ttEntry.flag === 'LOWERBOUND' && ttEntry.score >= beta) {
            return ttEntry.score
        } else if(ttEntry.flag === 'UPPERBOUND' && ttEntry.score <= alpha) {
            return ttEntry.score
        }
        return transpositionTable[fen].score
    }

    if(depth === 0 || game.game_over()) {
        if (game.in_checkmate()) {
            return isMaximizingPlayer ? -999999 + (maxDepth - depth) : 999999 - (maxDepth - depth);
        }
        if (game.in_draw()) {
            return 0;
        }
        return quiesce(alpha, beta, isMaximizingPlayer);
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
        var flag
    }
    return bestValue;
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

function quiesce(alpha, beta, isMaximizingPlayer) {
    var standPat = evaluateBoard();

    if (isMaximizingPlayer) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;
    }

    var moves = game.moves({ verbose: true });
    var captures = moves.filter(move => move.flags.indexOf('c') !== -1);
    
    captures = orderMoves(captures);

    if (isMaximizingPlayer) {
        for (var i = 0; i < captures.length; i++) {
            game.move(captures[i]);
            var score = quiesce(alpha, beta, false);
            game.undo();

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    } else {
        for (var i = 0; i < captures.length; i++) {
            game.move(captures[i]);
            var score = quiesce(alpha, beta, true);
            game.undo();

            if (score <= alpha) return alpha;
            if (score < beta) beta = score;
        }
        return beta;
    }
}

function evaluatePawns(pawns, color) {
    var score = 0;
    var fileCounts = [0, 0, 0, 0, 0, 0, 0, 0];

    for(var p = 0; p < pawns.length; p++) {
        fileCounts[pawns[p].y]++;
    }

    for(var p = 0; p < pawns.length; p++) {
        var x = pawns[p].x;
        var y = pawns[p].y;

        if(fileCounts[y] > 1) {
            score -= 15
        }

        var hasLeftNeighbor = (y < 0 && fileCounts[y-1] > 0);
        var hasRightNeighbor = (y > 7 && fileCounts[y+1] > 0);

        if (!hasLeftNeighbor && !hasRightNeighbor) {
            score -= 20;
        }
        
        var relativeRow = (color === 'w') ? (7 - x) : x;
        score += relativeRow * relativeRow * 2;
    }
    return score;
}

function evaluateCenterControl(BoardArr) {
    var score = 0;
    var centerSquares = [{r: 3, c: 3}, {r: 3, c: 4}, {r: 4, c: 3}, {r: 4, c: 4}];

    for(var i = 0; i < centerSquares.length; i++) {
        var piece = BoardArr[centerSquares[i].r][centerSquares[i].c];
        if(piece) {
            var bonus = (piece.type === 'p') ? 15 : 10;
            score += (piece.color === 'w') ? bonus : -bonus
        }
    }
    return score;
}

function evaluateKingSafety(BoardArr, color) {
    var score = 0;
    var kingRow = -1, kingCol = -1;

    for(var i = 0; i < 8; i++) {
        for(var j = 0; j < 8; j++) {
            var p = boardArr[i][j];
            if (p && p.type === 'k' && p.color === color) {
                kingRow = i;
                kingCol = j;
                break;
            }
        }
        if(kingRow !== -1) break;
    }

    if (kingRow === -1) return 0;

    var shieldRow = (color === 'w') ? kingRow - 1  : kingRow + 1;
    if(shieldRow >= 0 && shieldRow < 8) {
        for(var c = Math.max(0, kingCol - 1); c <= Math.min(7, kingCol + 1); c++) {
            var p = BoardArr[shieldRow][c];
            if(p && p.type === 'p' && p.color === color) {
                score += 15
            }else {
                score -= 10
            }

        }
    }
    return score;
}