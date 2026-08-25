
class FastBitboardEngine {
    constructor(fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        this.pieces = {
            P: [0, 0], N: [0, 0], B: [0, 0], R: [0, 0], Q: [0, 0], K: [0, 0],
            p: [0, 0], n: [0, 0], b: [0, 0], r: [0, 0], q: [0, 0], k: [0, 0]
        };
        this.occWhite = [0, 0];
        this.occBlack = [0, 0];
        this.occBoth  = [0, 0];

        this.turn = 0; 
        this.castling = 0xF; 
        this.epSquare = -1;
        this.halfMoves = 0;
        this.fullMoves = 1;

        this.moveBuffer = new Int32Array(256);
        this.history = [];

        this.DE_BRUIJN_32 = new Int32Array([
            0, 1, 28, 2, 29, 14, 24, 3, 30, 22, 20, 15, 25, 17, 4, 8,
            31, 27, 13, 23, 21, 19, 16, 7, 26, 12, 18, 6, 11, 5, 10, 9
        ]);

        this.sqNames = new Array(64);
        this.sqMap = {};
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let sq = r * 8 + c;
                let name = files[c] + (8 - r);
                this.sqNames[sq] = name;
                this.sqMap[name] = sq;
            }
        }

        this.initAttackTables();
        this.loadFen(fen);
    }


    lsb32(val) {
        return this.DE_BRUIJN_32[Math.imul((val & -val) >>> 0, 0x077CB531) >>> 27];
    }

    getLSB(bb) {
        if (bb[0] !== 0) return this.lsb32(bb[0]);
        if (bb[1] !== 0) return 32 + this.lsb32(bb[1]);
        return -1;
    }


    initAttackTables() {
        this.KNIGHT_ATTACKS = Array.from({ length: 64 }, () => [0, 0]);
        this.KING_ATTACKS   = Array.from({ length: 64 }, () => [0, 0]);
        this.RAY_ATTACKS    = Array.from({ length: 64 }, () => Array.from({ length: 8 }, () => [0, 0]));

        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [ 1, 1]];

        for (let sq = 0; sq < 64; sq++) {
            let r = Math.floor(sq / 8), c = sq % 8;

            const kOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
            for (let [dr, dc] of kOffsets) {
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    let targetSq = nr * 8 + nc;
                    this.setBit(this.KNIGHT_ATTACKS[sq], targetSq);
                }
            }


            const kingOffsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
            for (let [dr, dc] of kingOffsets) {
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    this.setBit(this.KING_ATTACKS[sq], nr * 8 + nc);
                }
            }

            for (let d = 0; d < 8; d++) {
                let [dr, dc] = dirs[d];
                let nr = r + dr, nc = c + dc;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    this.setBit(this.RAY_ATTACKS[sq][d], nr * 8 + nc);
                    nr += dr;
                    nc += dc;
                }
            }
        }
    }

    setBit(bb, sq) {
        if (sq < 32) bb[0] |= (1 << sq);
        else bb[1] |= (1 << (sq - 32));
    }

    encodeMove(from, to, flags) {
        return (from & 0x3F) | ((to & 0x3F) << 6) | ((flags & 0x0F) << 12);
    }

    decodeFrom(move)  { return move & 0x3F; }
    decodeTo(move)    { return (move >> 6) & 0x3F; }
    decodeFlags(move) { return (move >> 12) & 0x0F; }

    parseSan(move) {
        let from = this.decodeFrom(move);
        let to = this.decodeTo(move);
        let flags = this.decodeFlags(move);
        if (flags === 4) return 'O-O';
        if (flags === 5) return 'O-O-O';
        return `${this.sqNames[from]}-${this.sqNames[to]}`;
    }


    generateMoves(buffer = this.moveBuffer) {
        let count = 0;
        let isWhite = (this.turn === 0);
        let myOcc = isWhite ? this.occWhite : this.occBlack;
        let oppOcc = isWhite ? this.occBlack : this.occWhite;


        let knights = [this.pieces[isWhite ? 'N' : 'n'][0], this.pieces[isWhite ? 'N' : 'n'][1]];
        while (knights[0] !== 0 || knights[1] !== 0) {
            let from = this.getLSB(knights);
            let att0 = this.KNIGHT_ATTACKS[from][0] & ~myOcc[0];
            let att1 = this.KNIGHT_ATTACKS[from][1] & ~myOcc[1];
            
            let targets = [att0, att1];
            while (targets[0] !== 0 || targets[1] !== 0) {
                let to = this.getLSB(targets);
                let isCap = (to < 32 ? (oppOcc[0] & (1 << to)) : (oppOcc[1] & (1 << (to - 32)))) !== 0;
                buffer[count++] = this.encodeMove(from, to, isCap ? 2 : 0);
                this.clearBit(targets, to);
            }
            this.clearBit(knights, from);
        }


        let kingSq = this.getLSB(this.pieces[isWhite ? 'K' : 'k']);
        if (kingSq !== -1) {
            let katt = [this.KING_ATTACKS[kingSq][0] & ~myOcc[0], this.KING_ATTACKS[kingSq][1] & ~myOcc[1]];
            while (katt[0] !== 0 || katt[1] !== 0) {
                let to = this.getLSB(katt);
                let isCap = (to < 32 ? (oppOcc[0] & (1 << to)) : (oppOcc[1] & (1 << (to - 32)))) !== 0;
                buffer[count++] = this.encodeMove(kingSq, to, isCap ? 2 : 0);
                this.clearBit(katt, to);
            }
        }

        let legalCount = 0;
        for (let i = 0; i < count; i++) {
            let move = buffer[i];
            if (this.makeMove(move)) {
                buffer[legalCount++] = move;
                this.unmakeMove();
            }
        }

        return legalCount;
    }

//asdf
    makeMove(packedMove) {
        let from = this.decodeFrom(packedMove);
        
        let flags = this.decodeFlags(packedMove);

        let piece = this.getPieceAt(from);
        if (!piece) return false;

        let captured = (flags === 2 || flags === 3) ? this.getPieceAt(to) : null;

        this.history.push({
            move: packedMove,
            piece,
            captured,
            castling: this.castling,
            epSquare: this.epSquare,
            halfMoves: this.halfMoves,
            fullMoves: this.fullMoves
        });

        this.clearBit(this.pieces[piece], from)
        if (captured) this.clearBit(this.pieces[captured], to);
        this.setBit(this.pieces[piece], to);

        this.updateOccupancies();

        let kingSq = this.getLSB(this.pieces[this.turn === 0 ? 'K' : 'k']);
        if (this.isSquareAttacked(kingSq, this.turn === 0 ? 1 : 0)) {
            this.unmakeMove();
            return false;
        }

        this.turn = 1 - this.turn;
        return true;
    }

    unmakeMove() {
        if (this.history.length === 0) return;
        let state = this.history.pop();
        let from = this.decodeFrom(state.move);
        let to = this.decodeTo(state.move);

        this.clearBit(this.pieces[state.piece], to);
        this.setBit(this.pieces[state.piece], from);

        if (state.captured) {
            this.setBit(this.pieces[state.captured], to);
        }

        this.castling = state.castling;
        this.epSquare = state.epSquare;
        this.halfMoves = state.halfMoves;
        this.fullMoves = state.fullMoves;
        this.turn = 1 - this.turn;

        this.updateOccupancies();
    }


    clearBit(bb, sq) {
        if (sq < 32) bb[0] &= ~(1 << sq);
        else bb[1] &= ~(1 << (sq - 32));
    }

    updateOccupancies() {
        this.occWhite[0] = this.pieces.P[0] | this.pieces.N[0] | this.pieces.B[0] | this.pieces.R[0] | this.pieces.Q[0] | this.pieces.K[0];
        this.occWhite[1] = this.pieces.P[1] | this.pieces.N[1] | this.pieces.B[1] | this.pieces.R[1] | this.pieces.Q[1] | this.pieces.K[1];

        this.occBlack[0] = this.pieces.p[0] | this.pieces.n[0] | this.pieces.b[0] | this.pieces.r[0] | this.pieces.q[0] | this.pieces.k[0];
        this.occBlack[1] = this.pieces.p[1] | this.pieces.n[1] | this.pieces.b[1] | this.pieces.r[1] | this.pieces.q[1] | this.pieces.k[1];

        this.occBoth[0] = this.occWhite[0] | this.occBlack[0];
        this.occBoth[1] = this.occWhite[1] | this.occBlack[1];
    }

    getPieceAt(sq) {
        let idx = sq < 32 ? 0 : 1;
        let mask = 1 << (sq % 32);
        for (let p in this.pieces) {
            if ((this.pieces[p][idx] & mask) !== 0) return p;
        }
        return null;
    }

    isSquareAttacked(sq, attackerColor) {
        if (sq === -1) return false;
        let isWhite = (attackerColor === 0);
        let knights = this.pieces[isWhite ? 'N' : 'n'];
        let idx = sq < 32 ? 0 : 1;
        let mask = 1 << (sq % 32);

        if (((this.KNIGHT_ATTACKS[sq][idx] & knights[idx]) & mask) !== 0) return true;
        return false;
    }

    loadFen(fen) {
        for (let p in this.pieces) { this.pieces[p][0] = 0; this.pieces[p][1] = 0; }
        let parts = fen.trim().split(/\s+/);
        let rows = parts[0].split('/');

        for (let r = 0; r < 8; r++) {
            let col = 0;
            for (let i = 0; i < rows[r].length; i++) {
                let char = rows[r][i];
                if (!isNaN(char)) col += parseInt(char, 10);
                else {
                    this.setBit(this.pieces[char], r * 8 + col);
                    col++;
                }
            }
        }
        this.turn = parts[1] === 'w' ? 0 : 1;
        this.updateOccupancies();
    }

    fen() {
        let fen = '';
        for (let r = 0; r < 8; r++) {
            let empty = 0;
            for (let c = 0; c < 8; c++) {
                let sq = r * 8 + c;
                let piece = this.getPieceAt(sq);
                if (!piece) empty++;
                else {
                    if (empty > 0) { fen += empty; empty = 0; }
                    fen += piece;
                }
            }
            if (empty > 0) fen += empty;
            if (r < 7) fen += '/';
        }
        fen += ` ${this.turn === 0 ? 'w' : 'b'} - - 0 1`;
        return fen;
    }
}