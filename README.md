# Minimax Chess Bot
A browser based chess bot that uses piece square tables, transposition tables, minimax, alpha-beta pruning and zobrist hashing techniques. You can also play both with the black and white pieces against the chess bot.
![chess bot image](https://raw.githubusercontent.com/AkshayK-960/chessbot/refs/heads/master/Screenshot%20From%202026-10-11%2019-56-07.png)

## How to Play
1. To play against this chess bot, you can head over to the [Releases page](https://github.com/AkshayK-960/chessbot/releases/), 
2. Download the zip file of the latest release
3. extract the zip file
4. click the `index.html` file
5. Play!

## Features
This chess bot has many optimization methods, and these help it perform better, inclding:
* Minimax algorithm
* Alpha-Beta Pruning
* Zobrist Hashing
* Move Depth implementation

## How it works
1. In simple terms, this chess bot finds the best move by calculating the best evaluation value using an algorithm. The chess algorithm searches all the tress possible from the position in a given chess position. The alpha-beta pruning and minimax cut out most of the useless moves/bad moves.
2. The bot searches for the best move with a given time (5-10 seconds, but can be changed in the code) and it has a max depth of 10. So whichever one hits first (mostly the time limit) it plays the best move that was found so far.
3. This process uses a hashing method, and it indexes the calculated move evaluation, so if the move comes up in game, it is played, and it doesn't have to reevaluate the position, making it work more efficiently.
4. It also prioritizes some kinds of moves before others, like capturing a valuable piece, or getting the king to safety, because in case the search is cut off by the time limit, the move it makes is good.

## Tech Stack
This program uses:
* HTML
* JavaScript
* CSS

I used chess.js and chessboard.js libraries to generate a list of moves and generate a visual representation of the chess board.

## Credits
Throughout this project, These resources helped me a lot as I built this chess bot:
* [FreeCodeCamp - Simple chess AI step by step](https://www.freecodecamp.org/news/simple-chess-ai-step-by-step-1d55a9266977/)
* [Chess Programming Wiki - Alpha beta pruning, Generating moves, Piece Square tables, etc.](https://chessprogramming.org/)
* [YouTube - Coding Adventure: Chess](https://www.youtube.com/watch?v=U4ogK0MIzqk)
