var board = null;
var game = new Chess();
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');


var transpositionTable = {};
var botColor = 'b';
var maxDepth = 3;

var zobristTable = {};
var zobristTurnKey = 0;

function initializeZobrist() {
    var pieces = ['p', 'n', 'b', 'r', 'q', 'k', 'P', 'N', 'B', 'R', 'Q', 'K'];
    for (var i = 0; i < 64; i++) {
        zobristTable[i] = {};
        for (var p = 0; p < pieces.length; p++) {
            zobristTable[i][pieces[p]] = Math.floor(Math.random() * 0xFFFFFFFF);
        }
    }
    zobristTurnKey = Math.floor(Math.random() * 0xFFFFFFFF);
}

function computeZobristKey() {
    var hash = 0;
    var boardArr = game.board();
    for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
            var piece = boardArr[r][c];
            if (piece) {
                var sq = r * 8 + c;
                var pieceChar = (piece.color === 'w') ? piece.type.toUpperCase() : piece.type.toLowerCase();
                hash ^= zobristTable[sq][pieceChar];
            }
        }
    }
    if (game.turn() === 'b') {
        hash ^= zobristTurnKey;
    }
    return hash;
}

initializeZobrist();
var currentZobristKey = computeZobristKey();


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
        currentZobristKey = computeZobristKey();
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

    currentZobristKey = computeZobristKey();

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

// finish mobility (pawn chains etc.)

    totalEvaluation += evaluatePawns(whitePacks, 'w');
    totalEvaluation -= evaluatePawns(blackPacks, 'b');

    totalEvaluation += evaluateCenterControl(boardArr);

    if(!isEndgame) {
        totalEvaluation += evaluateKingSafety(boardArr, 'w');
        totalEvaluation += evaluateKingSafety(boardArr, 'b');
    }

    return totalEvaluation;
}

var maxTime = 5000;
var searchStartTime = 0;
var stopSearch = false;

function makeBestMove() {
    var possibleMoves = game.moves({ verbose: true });
    if (possibleMoves.length === 0) return;

    searchStartTime = Date.now();
    stopSearch = false;

    currentZobristKey = computeZobristKey();

    var bestMoveGlobal = possibleMoves[0];
    var currentDepth = 1;
    var targetMaxDepth = 10;
    var timeLimitMs = maxTime;

    while (currentDepth <= targetMaxDepth && !stopSearch) {
        var bestMoveThisDepth = null;
        var bestValue = (game.turn() === 'b') ? Infinity : -Infinity;
        var alpha = -Infinity;
        var beta = Infinity;

        possibleMoves = orderMoves(possibleMoves);

        for (var i = 0; i < possibleMoves.length; i++) {
            var currentMove = possibleMoves[i];

            var fromR = 8 - parseInt(currentMove.from[1]);
            var fromC = currentMove.from.charCodeAt(0) - 97;
            var toR = 8 - parseInt(currentMove.to[1]);
            var toC = currentMove.to.charCodeAt(0) - 97;
            var movingPieceChar = (currentMove.color === 'w') ? currentMove.piece.toUpperCase() : currentMove.piece.toLowerCase();

            currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
            if (currentMove.captured) {
                var capPieceChar = (currentMove.color === 'w') ? currentMove.captured.toLowerCase() : currentMove.captured.toUpperCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][capPieceChar];
            }
            if (currentMove.promotion) {
                var promoChar = (currentMove.color === 'w') ? currentMove.promotion.toUpperCase() : currentMove.promotion.toLowerCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][promoChar];
            } else {
                currentZobristKey ^= zobristTable[toR * 8 + toC][movingPieceChar];
            }
            currentZobristKey ^= zobristTurnKey;

            game.move(currentMove);
            var boardValue = minimax(currentDepth - 1, alpha, beta, game.turn() === 'w');
            game.undo();

            currentZobristKey ^= zobristTurnKey;
            if (currentMove.promotion) {
                var promoChar = (currentMove.color === 'w') ? currentMove.promotion.toUpperCase() : currentMove.promotion.toLowerCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][promoChar];
                currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
            } else {
                currentZobristKey ^= zobristTable[toR * 8 + toC][movingPieceChar];
                currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
            }
            if (currentMove.captured) {
                var capPieceChar = (currentMove.color === 'w') ? currentMove.captured.toLowerCase() : currentMove.captured.toUpperCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][capPieceChar];
            }

            if (stopSearch) break;

            if (game.turn() === 'b') {
                if (boardValue < bestValue) {
                    bestValue = boardValue;
                    bestMoveThisDepth = currentMove;
                }
                beta = Math.min(beta, bestValue);
            } else {
                if (boardValue > bestValue) {
                    bestValue = boardValue;
                    bestMoveThisDepth = currentMove;
                }
                alpha = Math.max(alpha, bestValue);
            }
        }

        if (!stopSearch && bestMoveThisDepth) {
            bestMoveGlobal = bestMoveThisDepth;
            console.log(`Depth ${currentDepth} completed in ${Date.now() - searchStartTime}ms. Best move: ${bestMoveGlobal.san}`);
            currentDepth++;
        } else {
            break;
        }
    }

    if (bestMoveGlobal) {
        var finalFromR = 8 - parseInt(bestMoveGlobal.from[1]);
        var finalFromC = bestMoveGlobal.from.charCodeAt(0) - 97;
        var finalToR = 8 - parseInt(bestMoveGlobal.to[1]);
        var finalToC = bestMoveGlobal.to.charCodeAt(0) - 97;
        var finalMovingChar = (bestMoveGlobal.color === 'w') ? bestMoveGlobal.piece.toUpperCase() : bestMoveGlobal.piece.toLowerCase();

        currentZobristKey ^= zobristTable[finalFromR * 8 + finalFromC][finalMovingChar];
        if (bestMoveGlobal.captured) {
            var finalCapChar = (bestMoveGlobal.color === 'w') ? bestMoveGlobal.captured.toLowerCase() : bestMoveGlobal.captured.toUpperCase();
            currentZobristKey ^= zobristTable[finalToR * 8 + finalToC][finalCapChar];
        }
        if (bestMoveGlobal.promotion) {
            var finalPromoChar = (bestMoveGlobal.color === 'w') ? bestMoveGlobal.promotion.toUpperCase() : bestMoveGlobal.promotion.toLowerCase();
            currentZobristKey ^= zobristTable[finalToR * 8 + finalToC][finalPromoChar];
        } else {
            currentZobristKey ^= zobristTable[finalToR * 8 + finalToC][finalMovingChar];
        }
        currentZobristKey ^= zobristTurnKey;

        game.move(bestMoveGlobal);
        board.position(game.fen());
        updateStatus();
    }


}

function minimax(depth, alpha, beta, isMaximizingPlayer) {
    var timeLimitMs = maxTime;
    if ((Date.now() - searchStartTime) > timeLimitMs) {
        stopSearch = true;
        return 0;
    }

    var ttKey = currentZobristKey;
    var alphaOrig = alpha;

    if (transpositionTable[ttKey] !== undefined && transpositionTable[ttKey].depth >= depth) {
        var ttEntry = transpositionTable[ttKey];
        if (ttEntry.flag === 'EXACT') return ttEntry.score;
        else if (ttEntry.flag === 'LOWERBOUND' && ttEntry.score >= beta) return ttEntry.score;
        else if (ttEntry.flag === 'UPPERBOUND' && ttEntry.score <= alpha) return ttEntry.score;
    }

    if (depth === 0 || game.game_over()) {
        if (game.in_checkmate()) {
            return isMaximizingPlayer ? -999999 + depth : 999999 - depth;
        }
        if (game.in_draw()) return 0;
        return quiesce(alpha, beta, isMaximizingPlayer);
    }

    var possibleMoves = game.moves({ verbose: true });
    possibleMoves = orderMoves(possibleMoves);

    var bestValue = isMaximizingPlayer ? -Infinity : Infinity;

    for (var i = 0; i < possibleMoves.length; i++) {
        var move = possibleMoves[i];

        var fromR = 8 - parseInt(move.from[1]);
        var fromC = move.from.charCodeAt(0) - 97;
        var toR = 8 - parseInt(move.to[1]);
        var toC = move.to.charCodeAt(0) - 97;
        var movingPieceChar = (move.color === 'w') ? move.piece.toUpperCase() : move.piece.toLowerCase();

        currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
        if (move.captured) {
            var capPieceChar = (move.color === 'w') ? move.captured.toLowerCase() : move.captured.toUpperCase();
            currentZobristKey ^= zobristTable[toR * 8 + toC][capPieceChar];
        }
        if (move.promotion) {
            var promoChar = (move.color === 'w') ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
            currentZobristKey ^= zobristTable[toR * 8 + toC][promoChar];
        } else {
            currentZobristKey ^= zobristTable[toR * 8 + toC][movingPieceChar];
        }
        currentZobristKey ^= zobristTurnKey;

        game.move(move);
        var score = minimax(depth - 1, alpha, beta, !isMaximizingPlayer);
        game.undo();

        currentZobristKey ^= zobristTurnKey;
        if (move.promotion) {
            var promoChar = (move.color === 'w') ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
            currentZobristKey ^= zobristTable[toR * 8 + toC][promoChar];
            currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
        } else {
            currentZobristKey ^= zobristTable[toR * 8 + toC][movingPieceChar];
            currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
        }
        if (move.captured) {
            var capPieceChar = (move.color === 'w') ? move.captured.toLowerCase() : move.captured.toUpperCase();
            currentZobristKey ^= zobristTable[toR * 8 + toC][capPieceChar];
        }

        if (stopSearch) return 0;

        if (isMaximizingPlayer) {
            bestValue = Math.max(bestValue, score);
            alpha = Math.max(alpha, bestValue);
        } else {
            bestValue = Math.min(bestValue, score);
            beta = Math.min(beta, bestValue);
        }

        if (beta <= alpha) break;
    }

    var flag = 'EXACT';
    if (bestValue <= alphaOrig) flag = 'UPPERBOUND';
    else if (bestValue >= beta) flag = 'LOWERBOUND';

    transpositionTable[ttKey] = { score: bestValue, depth: depth, flag: flag };
    
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
            var move = captures[i];

            var fromR = 8 - parseInt(move.from[1]);
            var fromC = move.from.charCodeAt(0) - 97;
            var toR = 8 - parseInt(move.to[1]);
            var toC = move.to.charCodeAt(0) - 97;
            var movingPieceChar = (move.color === 'w') ? move.piece.toUpperCase() : move.piece.toLowerCase();

            currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
            if (move.captured) {
                var capPieceChar = (move.color === 'w') ? move.captured.toLowerCase() : move.captured.toUpperCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][capPieceChar];
            }
            if (move.promotion) {
                var promoChar = (move.color === 'w') ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][promoChar];
            } else {
                currentZobristKey ^= zobristTable[toR * 8 + toC][movingPieceChar];
            }
            currentZobristKey ^= zobristTurnKey;

            game.move(move);
            var score = quiesce(alpha, beta, false);
            game.undo();

            currentZobristKey ^= zobristTurnKey;
            if (move.promotion) {
                var promoChar = (move.color === 'w') ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][promoChar];
                currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
            } else {
                currentZobristKey ^= zobristTable[toR * 8 + toC][movingPieceChar];
                currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
            }
            if (move.captured) {
                var capPieceChar = (move.color === 'w') ? move.captured.toLowerCase() : move.captured.toUpperCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][capPieceChar];
            }

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    } else {
        for (var i = 0; i < captures.length; i++) {
            var move = captures[i];

            var fromR = 8 - parseInt(move.from[1]);
            var fromC = move.from.charCodeAt(0) - 97;
            var toR = 8 - parseInt(move.to[1]);
            var toC = move.to.charCodeAt(0) - 97;
            var movingPieceChar = (move.color === 'w') ? move.piece.toUpperCase() : move.piece.toLowerCase();

            currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
            if (move.captured) {
                var capPieceChar = (move.color === 'w') ? move.captured.toLowerCase() : move.captured.toUpperCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][capPieceChar];
            }
            if (move.promotion) {
                var promoChar = (move.color === 'w') ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][promoChar];
            } else {
                currentZobristKey ^= zobristTable[toR * 8 + toC][movingPieceChar];
            }
            currentZobristKey ^= zobristTurnKey;

            game.move(move);
            var score = quiesce(alpha, beta, true);
            game.undo();

            currentZobristKey ^= zobristTurnKey;
            if (move.promotion) {
                var promoChar = (move.color === 'w') ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][promoChar];
                currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
            } else {
                currentZobristKey ^= zobristTable[toR * 8 + toC][movingPieceChar];
                currentZobristKey ^= zobristTable[fromR * 8 + fromC][movingPieceChar];
            }
            if (move.captured) {
                var capPieceChar = (move.color === 'w') ? move.captured.toLowerCase() : move.captured.toUpperCase();
                currentZobristKey ^= zobristTable[toR * 8 + toC][capPieceChar];
            }

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

        var hasLeftNeighbor = (y > 0 && fileCounts[y-1] > 0);
        var hasRightNeighbor = (y < 7 && fileCounts[y+1] > 0);

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
            var p = BoardArr[i][j];
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