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
var nodeCount = 0; 

var SQUARE_MAP = {};
var files = ['a','b','c','d','e','f','g','h'];
for (var r = 0; r < 8; r++) {
    for (var c = 0; c < 8; c++) {
        SQUARE_MAP[files[c] + (8 - r)] = r * 8 + c;
    }
}
var W_PIECES = {'p':'P', 'n':'N', 'b':'B', 'r':'R', 'q':'Q', 'k':'K'};
var B_PIECES = {'p':'p', 'n':'n', 'b':'b', 'r':'r', 'q':'q', 'k':'k'};

var killerMoves = []; 

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

function toggleMoveZobrist(move) {
    var fromSq = SQUARE_MAP[move.from];
    var toSq = SQUARE_MAP[move.to];
    var isWhite = (move.color === 'w');
    var movingChar = isWhite ? W_PIECES[move.piece] : B_PIECES[move.piece];

    currentZobristKey ^= zobristTable[fromSq][movingChar];
    
    if (move.captured) {
        var capChar = isWhite ? B_PIECES[move.captured] : W_PIECES[move.captured];
        currentZobristKey ^= zobristTable[toSq][capChar];
    }

    if (move.promotion) {
        var promoChar = isWhite ? W_PIECES[move.promotion] : B_PIECES[move.promotion];
        currentZobristKey ^= zobristTable[toSq][promoChar];
    } else {
        currentZobristKey ^= zobristTable[toSq][movingChar];
    }
    
    currentZobristKey ^= zobristTurnKey;
}

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
    [   20,   30,   10,  -30,  -30,   10,   30,   20 ],
    [   20,   40,   20,  -50,  -50,   20,   40,   20 ]
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
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    else {
        currentZobristKey = computeZobristKey();
        window.setTimeout(makeBestMove, 10);
        window.setTimeout(findEvalStr, 30);
    }
    updateStatus();
}

function onSnapEnd() { board.position(game.fen()); }

function updateStatus() {
    var status = '';
    var moveColor = game.turn() === 'b' ? 'Black' : 'White';
    if (game.in_checkmate()) status = 'Game over, ' + moveColor + ' is in checkmate.';
    else if (game.in_draw()) status = 'Game over, position is draw';
    else {
        status = moveColor + ' to move';
        if (game.in_check()) status += ' (King in check)';
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

function evaluateBoard() {
    var fen = game.fen();
    var totalEval = 0;
    var r = 0, c = 0;
    
    var wPawns = [0,0,0,0,0,0,0,0];
    var bPawns = [0,0,0,0,0,0,0,0];

    for (var i = 0; i < fen.length; i++) {
        var char = fen[i];
        if (char === ' ') break; 
        if (char === '/') { r++; c = 0; continue; }
        if (char >= '1' && char <= '8') { c += char.charCodeAt(0) - 48; continue; }
        
        var isWhite = (char < 'a');
        var type = char.toLowerCase();
        
        var val = pieceValues[type];
        var psqtTable = psqts[type];
        var psqtValue = isWhite ? psqtTable[r][c] : psqtTable[7 - r][c];
        
        if (isWhite) {
            totalEval += (val + psqtValue);
            if (type === 'p') wPawns[c]++;
        } else {
            totalEval -= (val + psqtValue);
            if (type === 'p') bPawns[c]++;
        }
        c++;
    }
    
    for (var f = 0; f < 8; f++) {
        if (wPawns[f] > 1) totalEval -= 15;
        if (bPawns[f] > 1) totalEval += 15;
        
        var wLeft = f > 0 ? wPawns[f-1] : 0;
        var wRight = f < 7 ? wPawns[f+1] : 0;
        if (wPawns[f] > 0 && wLeft === 0 && wRight === 0) totalEval -= 20;

        var bLeft = f > 0 ? bPawns[f-1] : 0;
        var bRight = f < 7 ? bPawns[f+1] : 0;
        if (bPawns[f] > 0 && bLeft === 0 && bRight === 0) totalEval += 20;
    }

    return totalEval;
}

var maxTime = 5000;
var searchStartTime = 0;
var stopSearch = false;

function makeBestMove() {
    var possibleMoves = game.moves({ verbose: true });
    if (possibleMoves.length === 0) return;

    transpositionTable = {}; 
    killerMoves = []; 
    nodeCount = 0; 
    searchStartTime = Date.now();
    stopSearch = false;

    currentZobristKey = computeZobristKey();

    var bestMoveGlobal = possibleMoves[0];
    var currentDepth = 1;
    var targetMaxDepth = 10;

    while (currentDepth <= targetMaxDepth && !stopSearch) {
        var bestMoveThisDepth = null;
        var bestValue = (game.turn() === 'b') ? Infinity : -Infinity;
        var alpha = -Infinity;
        var beta = Infinity;

        var ttEntry = transpositionTable[currentZobristKey];
        var ttBestMove = ttEntry ? ttEntry.bestMove : null;

        possibleMoves = orderMoves(possibleMoves, ttBestMove, currentDepth);

        for (var i = 0; i < possibleMoves.length; i++) {
            var currentMove = possibleMoves[i];

            toggleMoveZobrist(currentMove);
            game.move(currentMove);
            var boardValue = minimax(currentDepth - 1, alpha, beta, game.turn() === 'w');
            game.undo();
            toggleMoveZobrist(currentMove);

            if (stopSearch) break;

            if (game.turn() === 'b') {
                if (boardValue < bestValue) { bestValue = boardValue; bestMoveThisDepth = currentMove; }
                beta = Math.min(beta, bestValue);
            } else {
                if (boardValue > bestValue) { bestValue = boardValue; bestMoveThisDepth = currentMove; }
                alpha = Math.max(alpha, bestValue);
            }
        }

        if (!stopSearch && bestMoveThisDepth) {
            bestMoveGlobal = bestMoveThisDepth;
            console.log(`Depth ${currentDepth} completed in ${Date.now() - searchStartTime}ms (${nodeCount} nodes). Best move: ${bestMoveGlobal.san}`);
            currentDepth++;
        } else break;
    }

    if (bestMoveGlobal) {
        toggleMoveZobrist(bestMoveGlobal);
        game.move(bestMoveGlobal);
        board.position(game.fen());
        updateStatus();
        console.log('Time limit reached. Best Move  --> ' + bestMoveGlobal.san);
        console.log('')
    }
}

function minimax(depth, alpha, beta, isMaximizingPlayer) {
    nodeCount++;
    if ((nodeCount & 2047) === 0 && (Date.now() - searchStartTime) > maxTime) {
        stopSearch = true;
        return 0;
    }

    var ttKey = currentZobristKey;
    var alphaOrig = alpha;
    var ttBestMove = null;

    if (transpositionTable[ttKey] !== undefined) {
        var ttEntry = transpositionTable[ttKey];
        ttBestMove = ttEntry.bestMove;
        if (ttEntry.depth >= depth) {
            if (ttEntry.flag === 'EXACT') return ttEntry.score;
            if (ttEntry.flag === 'LOWERBOUND' && ttEntry.score >= beta) return ttEntry.score;
            if (ttEntry.flag === 'UPPERBOUND' && ttEntry.score <= alpha) return ttEntry.score;
        }
    }

    if (depth === 0 || game.game_over()) {
        if (game.in_checkmate()) return isMaximizingPlayer ? -999999 + depth : 999999 - depth;
        if (game.in_draw()) return 0;
        return quiesce(alpha, beta, isMaximizingPlayer, 0);
    }
    
    if (depth <= 2 && !game.in_check()) {
        var staticEval = evaluateBoard();
        var margin = 120 * depth; 
        if (isMaximizingPlayer && (staticEval - margin >= beta)) return beta;
        if (!isMaximizingPlayer && (staticEval + margin <= alpha)) return alpha;
    }

    var possibleMoves = game.moves({ verbose: true });
    possibleMoves = orderMoves(possibleMoves, ttBestMove, depth);

    var bestValue = isMaximizingPlayer ? -Infinity : Infinity;
    var bestMoveAtNode = null;

    for (var i = 0; i < possibleMoves.length; i++) {
        var move = possibleMoves[i];

        toggleMoveZobrist(move);
        game.move(move);
        
        var score;
        var isCheck = move.san.indexOf('+') !== -1;
        
        if (i < 4 || move.captured || move.promotion || isCheck || depth < 3) {
            score = minimax(depth - 1, alpha, beta, !isMaximizingPlayer);
        } else {
            score = minimax(depth - 2, alpha, beta, !isMaximizingPlayer);
            if ((isMaximizingPlayer && score > alpha) || (!isMaximizingPlayer && score < beta)) {
                score = minimax(depth - 1, alpha, beta, !isMaximizingPlayer);
            }
        }

        game.undo();
        toggleMoveZobrist(move);

        if (stopSearch) return 0;

        if (isMaximizingPlayer) {
            if (score > bestValue) { bestValue = score; bestMoveAtNode = move; }
            alpha = Math.max(alpha, bestValue);
        } else {
            if (score < bestValue) { bestValue = score; bestMoveAtNode = move; }
            beta = Math.min(beta, bestValue);
        }

        if (beta <= alpha) {
            if (!move.captured) killerMoves[depth] = move.san;
            break;
        }
    }

    var flag = 'EXACT';
    if (bestValue <= alphaOrig) flag = 'UPPERBOUND';
    else if (bestValue >= beta) flag = 'LOWERBOUND';

    transpositionTable[ttKey] = { score: bestValue, depth: depth, flag: flag, bestMove: bestMoveAtNode };
    
    return bestValue;
}

function orderMoves(moves, ttBestMove, depth) {
    if (moves.length <= 1) return moves;

    var ttSan = (ttBestMove && ttBestMove.san) ? ttBestMove.san : null;
    var killerSan = killerMoves[depth] || null;

    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        if (ttSan && move.san === ttSan) {
            move.sortScore = 100000;
        } else if (move.captured) {
            var victimValue = scorePieceValues[move.captured] || 1;
            var attackerValue = scorePieceValues[move.piece] || 1;
            move.sortScore = 10000 + (victimValue * 10 - attackerValue);
        } else if (killerSan && move.san === killerSan) {
            move.sortScore = 5000;
        } else {
            move.sortScore = move.promotion ? 900 : 0;
        }
    }

    return moves.sort(function(a, b) {
        return b.sortScore - a.sortScore;
    });
}

function quiesce(alpha, beta, isMaximizingPlayer, qDepth) {
    qDepth = qDepth || 0;
    var standPat = evaluateBoard();

    var BIG_DELTA = 975;
    if (isMaximizingPlayer) {
        if (standPat >= beta) return beta;
        if (standPat < alpha - BIG_DELTA) return alpha;
        if (standPat > alpha) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat > beta + BIG_DELTA) return beta;
        if (standPat < beta) beta = standPat;
    }

    if (qDepth >= 3) return isMaximizingPlayer ? alpha : beta;

    var moves = game.moves({ verbose: true });
    
    var captures = [];
    for (var i = 0; i < moves.length; i++) {
        if (moves[i].captured) captures.push(moves[i]);
    }
    
    if (captures.length === 0) return isMaximizingPlayer ? alpha : beta;

    captures = orderMoves(captures, null, 0);

    if (isMaximizingPlayer) {
        for (var i = 0; i < captures.length; i++) {
            var move = captures[i];

            toggleMoveZobrist(move);
            game.move(move);
            var score = quiesce(alpha, beta, false, qDepth + 1);
            game.undo();
            toggleMoveZobrist(move);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    } else {
        for (var i = 0; i < captures.length; i++) {
            var move = captures[i];

            toggleMoveZobrist(move);
            game.move(move);
            var score = quiesce(alpha, beta, true, qDepth + 1);
            game.undo();
            toggleMoveZobrist(move);

            if (score <= alpha) return alpha;
            if (score < beta) beta = score;
        }
        return beta;
    }
}

function findEvalStr() {
    var isMaximizing = (game.turn() === 'w');
    var evalScore = minimax(2, -Infinity, Infinity, isMaximizing);

    if(Math.abs(evalScore) > 900000) {
        var mateIn = Math.round((1000000 - Math.abs(evalScore)) / 2);
        var sign = evalScore > 0 ? '+' : '-'
        document.getElementById("eval").textContent = ("M" + sign + mateIn);
        return;
    }

    var evalUnits = (evalScore / 100).toFixed(1);
    document.getElementById("eval").textContent = (evalUnits);
}