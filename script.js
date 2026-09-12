var board = null;
var game = new FastBitboardEngine();
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');

var transpositionTable = {};
var botColor = 'b';
var maxDepth = 10;

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
var historyHeuristic = {}; // maps moveKey -> score

function moveKey(move) {
    return (move.from || '') + (move.to || '') + (move.promotion || '');
}

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
    for (var sq = 0; sq < 64; sq++) {
        var piece = game.getPieceAt(sq);
        if (piece) {
            var pieceChar = (game.turn === 0) ? piece.toUpperCase() : piece.toLowerCase();
            hash ^= zobristTable[sq][pieceChar];
        }
    }
    if (game.turn === 1) {
        hash ^= zobristTurnKey;
    }
    return hash;
}

// Initialize Zobrist only after game is created
initializeZobrist();
var currentZobristKey = computeZobristKey();

function toggleMoveZobrist(fromSq, toSq, piece) {
    var isWhite = (game.turn === 0);
    var movingChar = isWhite ? W_PIECES[piece] : B_PIECES[piece];

    currentZobristKey ^= zobristTable[fromSq][movingChar];
    currentZobristKey ^= zobristTable[toSq][movingChar];
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
    if (isGameOver()) return false;
    var isWhite = game.turn === 0;
    // Allow white to move (player is white)
    if ((isWhite && piece.color() === 'black') ||
        (!isWhite && piece.color() === 'white')) {
        return false;
    }
    return true;
}

function onDrop(source, target) {
    var moveCount = game.generateMoves();
    var sourceIdx = SQUARE_MAP[source];
    var targetIdx = SQUARE_MAP[target];
    
    var legalMove = null;
    for (var i = 0; i < moveCount; i++) {
        var move = game.moveBuffer[i];
        if (game.decodeFrom(move) === sourceIdx && game.decodeTo(move) === targetIdx) {
            legalMove = move;
            break;
        }
    }
    
    if (!legalMove) return 'snapback';
    
    if (!game.makeMove(legalMove)) {
        return 'snapback';
    }
    
    updateStatus();
    window.setTimeout(makeBestMove, 250);
    // return true;
}

function onSnapEnd() { 
    board.position(generateBoardPosition(), false);
}

function generateBoardPosition() {
    var pos = {};
    for (var sq = 0; sq < 64; sq++) {
        var piece = game.getPieceAt(sq);
        if (piece) {
            var sqName = game.sqNames[sq];
            var color = piece === piece.toUpperCase() ? 'w' : 'b';
            var pieceName = piece.toLowerCase();
            pos[sqName] = color + pieceName;
        }
    }
    return pos;
}

function isGameOver() {
    var moveCount = game.generateMoves();
    return moveCount === 0;
}

function updateStatus() {
    var status = '';
    var isWhite = game.turn === 0;
    var moveColor = isWhite ? 'White' : 'Black';
    var moveCount = game.generateMoves();
    
    if (moveCount === 0) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
    } else {
        status = moveColor + ' to move';
    }
    
    $('#status').html(status);
    $('#fen').html(game.fen());
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
    var totalEval = 0;
    var wPawns = [0,0,0,0,0,0,0,0];
    var bPawns = [0,0,0,0,0,0,0,0];

    for (var sq = 0; sq < 64; sq++) {
        var piece = game.getPieceAt(sq);
        if (!piece) continue;
        
        var type = piece.toLowerCase();
        var isWhite = piece === piece.toUpperCase();
        var val = pieceValues[type];
        var psqtTable = psqts[type];
        
        var r = Math.floor(sq / 8);
        var c = sq % 8;
        var psqtValue = isWhite ? psqtTable[r][c] : psqtTable[7 - r][c];
        
        if (isWhite) {
            totalEval += (val + psqtValue);
            if (type === 'p') wPawns[c]++;
        } else {
            totalEval -= (val + psqtValue);
            if (type === 'p') bPawns[c]++;
        }
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
    var moveCount = game.generateMoves();
    if (moveCount === 0) return;

    transpositionTable = {}; 
    killerMoves = []; 
    nodeCount = 0; 
    searchStartTime = Date.now();
    stopSearch = false;

    currentZobristKey = computeZobristKey();

    var bestMoveGlobal = null;
    var currentDepth = 1;
    var targetMaxDepth = maxDepth;

    while (currentDepth <= targetMaxDepth && !stopSearch) {
        var bestMoveThisDepth = null;
        var bestValue = (game.turn === 1) ? Infinity : -Infinity;
        var alpha = -Infinity;
        var beta = Infinity;

        var ttEntry = transpositionTable[currentZobristKey];
        var ttBestMove = ttEntry ? ttEntry.bestMove : null;

        var possibleMoves = [];
        for (var i = 0; i < moveCount; i++) {
            possibleMoves.push(game.moveBuffer[i]);
        }
        possibleMoves = orderMovesEncoded(possibleMoves, ttBestMove, currentDepth);

        for (var i = 0; i < possibleMoves.length; i++) {
            var currentMove = possibleMoves[i];
            var fromSq = game.decodeFrom(currentMove);
            var piece = game.getPieceAt(fromSq);

            toggleMoveZobrist(fromSq, game.decodeTo(currentMove), piece);
            game.makeMove(currentMove);
            var boardValue = minimax(currentDepth - 1, alpha, beta, game.turn === 0);
            game.unmakeMove();
            toggleMoveZobrist(fromSq, game.decodeTo(currentMove), piece);

            if (stopSearch) break;

            if (game.turn === 1) {
                if (boardValue < bestValue) { bestValue = boardValue; bestMoveThisDepth = currentMove; }
                beta = Math.min(beta, bestValue);
            } else {
                if (boardValue > bestValue) { bestValue = boardValue; bestMoveThisDepth = currentMove; }
                alpha = Math.max(alpha, bestValue);
            }
        }

        if (!stopSearch && bestMoveThisDepth) {
            bestMoveGlobal = bestMoveThisDepth;
            console.log('Depth ' + currentDepth + ' completed in ' + (Date.now() - searchStartTime) + 'ms (' + nodeCount + ' nodes). Best move: ' + game.parseSan(bestMoveGlobal));
            currentDepth++;
        } else break;
    }

    if (bestMoveGlobal) {
        var fromSq = game.decodeFrom(bestMoveGlobal);
        var piece = game.getPieceAt(fromSq);
        toggleMoveZobrist(fromSq, game.decodeTo(bestMoveGlobal), piece);
        game.makeMove(bestMoveGlobal);
        board.position(generateBoardPosition());
        updateStatus();
        console.log('Time limit reached. Best Move --> ' + game.parseSan(bestMoveGlobal));
        console.log('');
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

    var moveCount = game.generateMoves();
    if (depth === 0 || moveCount === 0) {
        if (moveCount === 0) return isMaximizingPlayer ? -999999 + depth : 999999 - depth;
        return quiesce(alpha, beta, isMaximizingPlayer, 0);
    }
    
    if (depth <= 2) {
        var staticEval = evaluateBoard();
        var margin = 120 * depth; 
        if (isMaximizingPlayer && (staticEval - margin >= beta)) return beta;
        if (!isMaximizingPlayer && (staticEval + margin <= alpha)) return alpha;
    }

    var possibleMoves;
    var ttEntryCached = transpositionTable[ttKey];
    if (ttEntryCached && ttEntryCached.orderedMoves) {
        possibleMoves = ttEntryCached.orderedMoves;
    } else {
        possibleMoves = [];
        for (var i = 0; i < moveCount; i++) {
            possibleMoves.push(game.moveBuffer[i]);
        }
        possibleMoves = orderMovesEncoded(possibleMoves, ttBestMove, depth);
        if (!transpositionTable[ttKey]) transpositionTable[ttKey] = { bestMove: null };
        transpositionTable[ttKey].orderedMoves = possibleMoves;
    }

    var bestValue = isMaximizingPlayer ? -Infinity : Infinity;
    var bestMoveAtNode = null;

    for (var i = 0; i < possibleMoves.length; i++) {
        var move = possibleMoves[i];
        var fromSq = game.decodeFrom(move);
        var toSq = game.decodeTo(move);
        var piece = game.getPieceAt(fromSq);

        toggleMoveZobrist(fromSq, toSq, piece);
        game.makeMove(move);
        
        var score;
        var targetPiece = game.getPieceAt(toSq);
        var isCapture = targetPiece !== null;
        
        if (i < 4 || isCapture || depth < 3) {
            score = minimax(depth - 1, alpha, beta, !isMaximizingPlayer);
        } else {
            score = minimax(depth - 2, alpha, beta, !isMaximizingPlayer);
            if ((isMaximizingPlayer && score > alpha) || (!isMaximizingPlayer && score < beta)) {
                score = minimax(depth - 1, alpha, beta, !isMaximizingPlayer);
            }
        }

        game.unmakeMove();
        toggleMoveZobrist(fromSq, toSq, piece);

        if (stopSearch) return 0;

        if (isMaximizingPlayer) {
            if (score > bestValue) { bestValue = score; bestMoveAtNode = move; }
            alpha = Math.max(alpha, bestValue);
        } else {
            if (score < bestValue) { bestValue = score; bestMoveAtNode = move; }
            beta = Math.min(beta, bestValue);
        }

        if (beta <= alpha) {
            var hk = moveKey({ from: game.sqNames[fromSq], to: game.sqNames[toSq] });
            historyHeuristic[hk] = (historyHeuristic[hk] || 0) + (depth * depth);
            break;
        }
    }

    var flag = 'EXACT';
    if (bestValue <= alphaOrig) flag = 'UPPERBOUND';
    else if (bestValue >= beta) flag = 'LOWERBOUND';

    var existing = transpositionTable[ttKey] || {};
    existing.score = bestValue;
    existing.depth = depth;
    existing.flag = flag;
    existing.bestMove = bestMoveAtNode;
    transpositionTable[ttKey] = existing;
    
    return bestValue;
}

function orderMovesEncoded(moves, ttBestMove, depth) {
    if (moves.length <= 1) return moves;

    var ttSan = (ttBestMove !== null) ? game.parseSan(ttBestMove) : null;
    var killerSan = killerMoves[depth] || null;

    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        var moveSan = game.parseSan(move);
        var toSq = game.decodeTo(move);
        var targetPiece = game.getPieceAt(toSq);
        
        if (ttSan && moveSan === ttSan) {
            move.sortScore = 100000;
        } else if (targetPiece) {
            var fromSq = game.decodeFrom(move);
            var attackerPiece = game.getPieceAt(fromSq);
            var victimValue = scorePieceValues[targetPiece.toLowerCase()] || 1;
            var attackerValue = scorePieceValues[attackerPiece.toLowerCase()] || 1;
            move.sortScore = 10000 + (victimValue * 10 - attackerValue);
        } else if (killerSan && moveSan === killerSan) {
            move.sortScore = 1500;
        } else {
            move.sortScore = 0;
        }
        
        var moveKey = game.sqNames[game.decodeFrom(move)] + game.sqNames[game.decodeTo(move)];
        if (historyHeuristic[moveKey]) move.sortScore += historyHeuristic[moveKey];
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

    var moveCount = game.generateMoves();
    var captures = [];
    for (var i = 0; i < moveCount; i++) {
        var move = game.moveBuffer[i];
        var toSq = game.decodeTo(move);
        var targetPiece = game.getPieceAt(toSq);
        if (targetPiece) captures.push(move);
    }
    
    if (captures.length === 0) return isMaximizingPlayer ? alpha : beta;

    captures = orderMovesEncoded(captures, null, 0);

    if (isMaximizingPlayer) {
        for (var i = 0; i < captures.length; i++) {
            var move = captures[i];
            var fromSq = game.decodeFrom(move);
            var piece = game.getPieceAt(fromSq);

            toggleMoveZobrist(fromSq, game.decodeTo(move), piece);
            game.makeMove(move);
            var score = quiesce(alpha, beta, false, qDepth + 1);
            game.unmakeMove();
            toggleMoveZobrist(fromSq, game.decodeTo(move), piece);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    } else {
        for (var i = 0; i < captures.length; i++) {
            var move = captures[i];
            var fromSq = game.decodeFrom(move);
            var piece = game.getPieceAt(fromSq);

            toggleMoveZobrist(fromSq, game.decodeTo(move), piece);
            game.makeMove(move);
            var score = quiesce(alpha, beta, true, qDepth + 1);
            game.unmakeMove();
            toggleMoveZobrist(fromSq, game.decodeTo(move), piece);

            if (score <= alpha) return alpha;
            if (score < beta) beta = score;
        }
        return beta;
    }
}

function findEvalStr() {
    var isMaximizing = (game.turn === 0);
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

function openLichessAnalysis() {
    if (typeof game !== 'undefined' && game.fen) {
        let currentFen = game.fen();
        let formattedFen = currentFen.replace(/ /g, '_');
        let lichessURL = `https://lichess.org/analysis/${formattedFen}`;
        window.open(lichessURL, '_blank')
    } else {
        console.error("chess instance not found");
        console.log("Alternatively, try copy-pasting the FEN or PGN into Lichess for current board analysis")
    }
}