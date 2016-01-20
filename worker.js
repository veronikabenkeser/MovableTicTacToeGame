(function() {
    process.on('message', function(e) {
        
        switch (e.messageType) {

            case 'record-move':
                recordMove(e.oldRow, e.oldCol, e.newRow, e.newCol, e.player);
                break;

            case 'start-game':
                setLevel(e.level);
                break;

            case 'check-game-state':
                if (playingBoard.length > 4) {
                    var outcome = boardContainsWin(playingBoard);
                    if (outcome[0]) {
                        messagesToSend['game-over'](outcome[1], outcome[2]);
                        break;
                    }
                }

                if (e.player === "computer") {
                    var resultArr = findEmptySpaces(playingBoard, 'human');
                    messagesToSend['post-avail-human-pos'](resultArr);
                }
                break;

            case "make-computer-move":
                var move = calculateComputerMove();
                messagesToSend['computer-move-done'](move);
                break;

            case 'restart':
                clearBoard();
                maxDepth = 0;
                break;
        }
    });

    var nameToPositionObj = {};
    nameToPositionObj[[1, 1]] = 8;
    nameToPositionObj[[1, 2]] = 1;
    nameToPositionObj[[1, 3]] = 6;
    nameToPositionObj[[2, 1]] = 3;
    nameToPositionObj[[2, 2]] = 5;
    nameToPositionObj[[2, 3]] = 7;
    nameToPositionObj[[3, 1]] = 4;
    nameToPositionObj[[3, 2]] = 9;
    nameToPositionObj[[3, 3]] = 2;

    var board = [
        [1, 1],
        [1, 2],
        [1, 3],
        [2, 1],
        [2, 2],
        [2, 3],
        [3, 1],
        [3, 2],
        [3, 3]
    ];

    var maxDepth = 0;
    var level = 4;
    var playingBoard = [];

    var messagesToSend = {
        'game-over': function(winner, arr) {
            process.send({
                messageType: 'game-over',
                winner: winner,
                pawns: arr
            });
        },

        'computer-move-done': function(move) {
            var oldRow = move[1][0];
            var oldCol = move[1][1];
            var newRow = move[2][0];
            var newCol = move[2][1];
            process.send({
                messageType: 'computer-move-done',
                oldRow: oldRow,
                oldCol: oldCol,
                newRow: newRow,
                newCol: newCol
            });
        },
        'post-avail-human-pos': function(arr) {
            process.send({
                messageType: 'avail-human-pos',
                allPos: arr
            });
        }
    };

    function recordMove(oldRow, oldCol, newRow, newCol, player) {
        if (playingBoard.length === 6) {
            makeTentativeMove([oldRow, oldCol], [newRow, newCol], player);
        }
        else {
            playingBoard.push([
                [parseInt(newRow, 10), parseInt(newCol, 10)], player
            ]);
        }
    }

    function clearBoard() {
        playingBoard = [];
    }

    function setLevel(diffLevel) {
        level = parseInt(diffLevel, 10);

    }

    function getLevel() {
        return level;
    }

    function calculateComputerMove() {
        maxDepth = 0;
        var alpha = -1000;
        var beta = 1000;
        return minimax(getLevel(), "computer", alpha, beta);
    }

    function minimax(depth, player, alpha, beta) {
        var score;
        var availablePos = findEmptySpaces(playingBoard, player);
        var bestRow, bestColumn;
        var oldRow = -1;
        var oldCol = -1;
        var result = 0;

        if (depth === maxDepth || !availablePos.length || boardContainsWin(playingBoard)[0]) {
            if (boardContainsWin(playingBoard)[0]) {
                if (depth > maxDepth) {
                    maxDepth = depth;
                }
            }
            return [evaluate(playingBoard)];
        }
        else {
            for (var p = 0; p < availablePos.length; p++) {
                var oldPos = availablePos[p][0];
                var newPos = availablePos[p][1];
                makeTentativeMove(oldPos, newPos, player);

                if (player === "computer") {
                    score = minimax(depth - 1, "human", alpha, beta)[0];
                    if (parseInt(score, 10) > parseInt(alpha, 10)) {
                        alpha = score;
                        bestRow = newPos[0];
                        bestColumn = newPos[1];
                        oldRow = oldPos[0];
                        oldCol = oldPos[1];
                    }
                }
                else {
                    score = minimax(depth - 1, "computer", alpha, beta)[0];
                    if (parseInt(score, 10) < parseInt(beta, 10)) {
                        beta = score;
                        bestRow = newPos[0];
                        bestColumn = newPos[1];
                        oldRow = oldPos[0];
                        oldCol = oldPos[1];
                    }
                }

                //Undo move
                if (oldPos.length) {
                    var plaBBefore = playingBoard;
                    makeTentativeMove(newPos, oldPos, player);
                }
                else {
                    deleteMove(newPos);
                }

                //Alpha-beta Pruning because the maxizer would never choose this inferior option.
                if (alpha >= beta) {
                    break;
                }
            }
            player === "computer" ? result = alpha : result = beta;
            return [result, [oldRow, oldCol],
                [bestRow, bestColumn]
            ];
        }
    }

    function deleteMove(newPosArr) {
        for (var i = 0; i < playingBoard.length; i++) {
            if (playingBoard[i][0].toString() === newPosArr.toString()) {
                playingBoard.splice(i, 1);
                break;
            }
        }
    }

    function boardContainsWin(currentBoard) {
        if (currentBoard.length > 4) {
            var winner;
            var winningPawns;
            var result = calcIndividualScores(currentBoard);
            var humanPoints = result[0];
            var humanPawns = result[1];
            var computerPoints = result[2];
            var computerPawns = result[3]

            if (humanPoints === 15 && humanPawns.length === 3 || computerPoints === 15 && computerPawns.length === 3) {
                if (humanPoints === 15) {
                    winner = 'human';
                    winningPawns = humanPawns;
                }
                else {
                    winner = 'computer';
                    winningPawns = computerPawns;
                }
                return [true, winner, winningPawns];
            }
        }
        return [false];
    }

    function categorizePawns(currentBoard) {
        var humanPawns = [];
        var computerPawns = [];
        currentBoard.forEach(function(val) {
            var coord = val[0];
            coord = JSON.parse("[" + coord + "]");;
            if (val[1] === 'human') {
                humanPawns.push(coord);
            }
            else {
                computerPawns.push(coord);
            }
        });
        return [humanPawns, computerPawns];
    }

    function evaluate(currentBoard) {
        var result = calcIndividualScores(currentBoard);
        var humanPoints = result[0];
        var humanPawnCoordArr = result[1];
        var computerPoints = result[2];
        var computerPawnCoordArr = result[3];
        var totalHumanScore = calcTotalScore("human", humanPoints, humanPawnCoordArr, currentBoard);
        var totalComputerScore = calcTotalScore("computer", computerPoints, computerPawnCoordArr, currentBoard);
        return parseInt(totalHumanScore, 10) + parseInt(totalComputerScore, 10);
    }

    function calcIndividualScores(currentBoard) {
        var pawns = categorizePawns(currentBoard);
        var humanPawns = pawns[0];
        var computerPawns = pawns[1];
        var humanPointsAndCoord = calcPoints(humanPawns);
        var humanPoints = humanPointsAndCoord[0];
        var humanPawnCoordArr = humanPointsAndCoord[1];
        var computerPointsAndCoord = calcPoints(computerPawns);
        var computerPoints = computerPointsAndCoord[0];
        var computerPawnCoordArr = computerPointsAndCoord[1];
        return [humanPoints, humanPawnCoordArr, computerPoints, computerPawnCoordArr];
    }

    function calcPoints(playerPawns) {
        var members = [];
        var score = 0;
        for (var property in nameToPositionObj) {
            if (nameToPositionObj.hasOwnProperty(property)) {
                for (var k = 0; k < playerPawns.length; k++) {
                    if (playerPawns[k].toString() === property) {
                        score += parseInt(nameToPositionObj[property], 10);
                        members.push(property);
                    }
                }
            }
        }
        return [score, members];
    }

    function calcTotalScore(player, playerScore, membersArr, currentPlayingBoard) {
        var numOfMovesAway;
        var opposition;
        var score = 0;

        //Got three in a row / winning row
        if (playerScore === 15 && membersArr.length === 3) {
            score += 600;
        }
        else {
            //If there is no combination of 3 in-a-row, award points based on how close you are to a win
            //If 1 move away from the win, 80
            numOfMovesAway = countMovesAway(playerScore, membersArr, currentPlayingBoard);

            if (numOfMovesAway === 1) {
                score += 80;
            }
            else if (numOfMovesAway === 2) {
                score += 10;
            }
            //The less moves the oposition is able to make , the better for the player
            if (player === "computer") {
                opposition = "human";
            }
            else {
                opposition = "computer";
            }
            var numOfOppMoves = findEmptySpaces(playingBoard, opposition).length;

            if (numOfOppMoves <= 2) {
                score += 60;
            }
        }
        if (player === 'human' && score !== 0) {
            score *= -1;
        }
        return score;
    }

    function breakupPositions(array) {
        var result = [];
        if (array.length === 3) { //Each player has 3 pawns
            //Result is comprised of an array of 2 positions to be tested to see whether they're next to each other and the name of the cell that's left out (the name of the third cell)
            result.push([
                [array[0], array[1]], array[2]
            ]);
            result.push([
                [array[0], array[2]], array[1]
            ]);
            result.push([
                [array[1], array[2]], array[0]
            ]);
        }
        return result;
    }

    function countMovesAway(playerScore, memberCoordArr, playingB) {
        var minMovesAway = 3;
        var movesAway;
        var winningPositionCoord;
        var areInaRow = true;
        var winningSpaceIsEmpty = true;

        //See whethere there are 2 in a row and we can freely move the 3rd one to win
        //2 of them + empty space =15

        var arrOfPoints = breakupPositions(memberCoordArr);
        arrOfPoints.forEach(function(pointsArr) {
            var leftoutPointCoordArr = JSON.parse("[" + pointsArr[1] + "]");
            var pointOneValue = nameToPositionObj[pointsArr[0][0]];
            var pointTwoValue = nameToPositionObj[pointsArr[0][1]];
            var sumOfTwoPoints = pointOneValue + pointTwoValue;
            var thirdPointValue = 15 - sumOfTwoPoints;

            //If the tentativeThirdPoint is more than 9, 0, or the same number as one of the two previous points, then the points are not in a row
            if (thirdPointValue <= 0 || thirdPointValue > 9 || thirdPointValue === pointOneValue || thirdPointValue === pointTwoValue) {
                areInaRow = false;
            }

            // Found 2 in a row
            if (areInaRow === "true") {
                //third point coordinates

                winningPositionCoord = findCoordinates(thirdPointValue);

                //For each 2-in-a-row set, determine how many moves it takes the 3rd pawn to get to 3-in-a-row
                //If third position is open and it takes 1 move to get there, 80 points
                //If the winning space is empty
                playingB.forEach(function(position) {
                    if (position[0].toString() === winningPositionCoord.toString()) {
                        winningSpaceIsEmpty = false;
                    }
                });

                if (winningSpaceIsEmpty) {
                    //if adjacent/within 1 step

                    if ((winningPositionCoord[0] === leftoutPointCoordArr[0] || winningPositionCoord[0] + 1 === leftoutPointCoordArr[0] || winningPositionCoord[0] - 1 === leftoutPointCoordArr[0]) && (winningPositionCoord[1] === leftoutPointCoordArr[1] || winningPositionCoord[1] + 1 === leftoutPointCoordArr[1] || winningPositionCoord[1] - 1 === leftoutPointCoordArr[1])) {
                        movesAway = 1;
                        if (movesAway < minMovesAway) {
                            minMovesAway = movesAway;
                        }
                    }
                }
                movesAway = 2;
                if (movesAway < minMovesAway) {
                    minMovesAway = movesAway;
                }
            }
        });
        return minMovesAway;
    }

    function makeTentativeMove(moveFrom, moveTo, player) {
        var moveFrom = JSON.parse("[" + moveFrom + "]");
        var moveTo = JSON.parse("[" + moveTo + "]");

        if (moveFrom.length) {
            //Remove old pawn
            deleteMove(moveFrom);
        }
        //Add pawn
        playingBoard.push([moveTo, player]);
    }

    function compareBoards(positionBoard, positionAndPlayerBoard) {
        var allEmptySpaces = [];
        for (var i = 0; i < positionBoard.length; i++) {
            var repeatFound = false;
            for (var q = 0; q < positionAndPlayerBoard.length; q++) {

                if (positionBoard[i].toString() === positionAndPlayerBoard[q][0].toString()) {
                    repeatFound = true;

                }
            }
            if (!repeatFound) {
                allEmptySpaces.push(positionBoard[i]);
            }
        }
        return allEmptySpaces;
    }

    function findEmptySpaces(currentBoard, player) {
        var result = [];
        var entireB = board.slice();
        var thisB = currentBoard.slice();
        //Get all empty spaces
        var allEmptySpaces = compareBoards(entireB, thisB);

        if (currentBoard.length < 6) {
            allEmptySpaces.forEach(function(coordArr) {
                result.push([
                    [], coordArr
                ]);
            });
        }
        else {
            //Find all of the names of the empty squares that are adjacent to the player's  pawn
            //Filter by player
            var takenByThisPlayer = thisB.filter(function(val) {
                return val[1] === player;
            });
            takenByThisPlayer.forEach(function(existingPos) {

                var possibleMovesArr = findAdjacent(existingPos[0],
                    allEmptySpaces);
                possibleMovesArr.forEach(function(move) {
                    result.push([existingPos[0], move]);
                });
            });
        }
        return result;
    }

    function findAdjacent(currentPosArr, allEmptySpaces) {
        var row = parseInt(currentPosArr[0], 10);
        var col = parseInt(currentPosArr[1], 10);

        allEmptySpaces = allEmptySpaces.filter(function(val) {
            return (!(row === val[0] && col === val[1])) && (val[0] ===
                row || val[0] + 1 === row || val[0] - 1 ===
                row) && (val[1] === col || val[1] + 1 ===
                col || val[1] - 1 === col);
        });
        return allEmptySpaces;
    }

    function findCoordinates(val) {
        for (key in nameToPositionObj) {
            if (nameToPositionObj.hasOwnProperty(key)) {
                if (nameToPositionObj[key] === val) {
                    return key;
                }
            }
        }
    }
})();