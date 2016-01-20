require.config({
	paths: {
		'jquery': 'jquery.min',
		'socket.io': "../../socket.io/socket.io"
	},
	shim: {
		'socket.io': {
			exports: 'io'
		}
	}
});

require(['jquery', 'socket.io'], function($, io) {
	$(function() {
		var socket = io.connect('https://tic-tac-toe-final-autumncat.c9users.io/');
		var _availArr = [];
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
		var _humanMovesCount = 0;
		var _isHumanTurn = false;
		var messages = {
			'human-win': 'You Win!',
			'computer-win': 'Computer wins!',
			'human-turn': 'Your turn!'
		};

		var allPages = {
			page0Class: "instructions",
			page1Class: "intro",
			page2Class: "setting1",
			page3Class: "setting2",
			page4Class: "playing-page"

		};
		var displayPage = function(classN) {

			$('.all-content').children().each(function(index, child) {
				if (!$(child).hasClass('hide')) {
					$(child).addClass('hide');
				}
			});
			$('.hide.' + classN).removeClass('hide');
		};

		var _logistics = {
			init: function() {
				_logistics.setLevel();
				_logistics.setPawns();
			},
			resetSettings: function() {
				_logistics.settings.level = 0,
					_logistics.settings.humanPawn = "";
				_logistics.settings.computerPawn = "";

				$(".difficulty .level").children().removeClass('selected');
				$(".selection").removeClass('selected');
			},
			settings: {
				level: 0,
				humanPawn: "",
				computerPawn: ""
			},
			setLevel: function() {
				_logistics.settings.level = 0;
				$(".difficulty .level").children().click(function() {
					$('.difficulty div').removeClass('selected');
					$(this).addClass('selected');
					if ($(this).text() === "n00b") {
						_logistics.settings.level = 1;
					} else if ($(this).text() === "expert") {
						_logistics.settings.level = 2;
					} else {
						_logistics.settings.level = 4;
					}
					displayPage(allPages.page3Class);
				});
			},
			setPawns: function() {
				_logistics.settings.humanPawn = "";
				_logistics.settings.computerPawn = "";

				$(".selection").click(function() {
					$(this).addClass('selected');
					var humanPawn = $(this).attr('id');
					_logistics.settings.humanPawn = humanPawn;
					_logistics.settings.computerPawn = (humanPawn === 'X') ? 'O' : 'X';

					if (_logistics.settings.humanPawn && _logistics.settings.level) {
						displayPage(allPages.page4Class);
						startGame(_logistics.settings.humanPawn);
					}
				});
			}
		};

		var toggleRules = function() {
			$('.' + allPages.page0Class).toggleClass('hide');
			$('.' + allPages.page1Class).toggleClass('hide');
		};

		var setUpAllListeners = function() {
			$('#rules-button').click(function() {
				toggleRules();
			});
			$('#start-button').click(function() {
				displayPage(allPages.page2Class);
			});
			_logistics.init();

			$('.' + allPages.page0Class).click(function() {
				toggleRules();
			});
		};

		var _moves = {
			getCoordinates: function($obj) {
				var row = $obj.closest(".row").attr('id');
				var col = $obj.prevAll().length + 1;
				row = parseInt(row, 10);
				col = parseInt(col, 10);
				return [row, col];
			},
			markCells: function(row, col, colorClass) {
				$("#" + row + "").children().eq(parseInt(col, 10) - 1).addClass(colorClass);

			},
			clearGrid: function() {
				$(".grid div").children().empty();
				$(".row").children().removeClass('selected');
			},
			recordMove: function(oldRow, oldCol, newRow, newCol, player) {
				socket.emit('do-task', {
					messageType: 'record-move',
					oldRow: oldRow,
					oldCol: oldCol,
					newRow: newRow,
					newCol: newCol,
					player: player
				});

				socket.emit('do-task', {
					messageType: 'check-game-state',
					player: player
				});
			},
			clearPreviouslySelItems: function() {
				var highlightedName = 'highlighted' + _logistics.settings.humanPawn;
				$('.' + highlightedName).removeClass(highlightedName);

				$('.oldSq').removeClass('oldSq');
			},
			displayMove: function(oldRow, oldCol, newRow, newCol, player) {

				if (oldRow !== -1 && oldCol !== -1) {
					$("#" + oldRow + "").children().eq(oldCol - 1).empty();

				}

				$("#" + newRow + "").children().eq(newCol - 1).append(_logistics.settings[player + "Pawn"]);
			},

		};

		var _computerMoves = {
			startComputerMove: function() {
				_isHumanTurn = false;

				$(".message").empty();

				socket.emit('do-task', {
					messageType: 'make-computer-move'
				});
			}
		};

		var _humanMoves = {

			startHumanMove: function(allAvailPosArr) {

				_isHumanTurn = true;
				$(".message").text(messages["human-turn"]);
				_humanMoves.setAvailPos(allAvailPosArr);

			},

			findAdjacentSq: function($selectedObj, allAvailPosArr) {

				var oldCoord = _moves.getCoordinates($selectedObj);
				var oldRow = oldCoord[0];
				var oldCol = oldCoord[1];


				allAvailPosArr = allAvailPosArr.filter(function(oldAndNewPosArr) {

					return oldAndNewPosArr[0].toString() === [oldRow, oldCol].toString();
				});
				return allAvailPosArr;
			},

			highlightAdjacent: function(arr) {

				arr.forEach(function(oldAndNewPosArr) {

					var row = oldAndNewPosArr[1][0];
					var col = oldAndNewPosArr[1][1];

					_moves.markCells(row, col, "highlighted" + _logistics.settings.humanPawn);
				});

			},
			highlightAvailMoves: function($obj, allAvailPosArr) {

				if ($obj.text() === _logistics.settings.humanPawn) {

					var legalPosArr = _humanMoves.findAdjacentSq($obj, allAvailPosArr);
					_humanMoves.highlightAdjacent(legalPosArr);
				}
			},

			moveToSq: function($selectedSq, $oldSq) {

				var newRow = $selectedSq.closest(".row").attr('id');
				var newCol = $selectedSq.prevAll().length + 1;
				if ($oldSq) {
					var oldCoord = _moves.getCoordinates($oldSq);
					var oldRow = parseInt(oldCoord[0], 10);
					var oldCol = parseInt(oldCoord[1], 10);
					_humanMoves.endHumanMove(oldRow, oldCol, parseInt(newRow, 10), parseInt(newCol, 10));
				} else {
					_humanMoves.endHumanMove(-1, -1, newRow, newCol);
				}
			},

			setAvailPos: function(allAvailPosArr) {

				_availArr = allAvailPosArr;
			},

			getAvailPos: function() {
				return _availArr;
			},

			endHumanMove: function(oldRow, oldCol, newRow, newCol) {
				_moves.recordMove(oldRow, oldCol, newRow, newCol, 'human');
				_humanMovesCount++;
				_moves.displayMove(oldRow, oldCol, newRow, newCol, 'human');

				_computerMoves.startComputerMove();
			},

		};

		var gridListenerOn = function() {
			$(".row div").on("click", function() {
				if (_isHumanTurn) {
					var $thisObj = $(this);
					if (_humanMovesCount >= 3 && $thisObj.text() === _logistics.settings.humanPawn) {

						if (!$thisObj.hasClass('oldSq')) {
							_moves.clearPreviouslySelItems();
							var allAvailPosArr = _humanMoves.getAvailPos();
							_humanMoves.highlightAvailMoves($thisObj, allAvailPosArr);
							$thisObj.addClass('oldSq');
						} else {
							_moves.clearPreviouslySelItems();
						}

					} else if ($thisObj.text() === "" && _humanMovesCount >= 3) {
						if ($thisObj.hasClass('highlighted' + _logistics.settings.humanPawn)) {
							_humanMoves.moveToSq($thisObj, $(".oldSq"));
							_moves.clearPreviouslySelItems();
						}
					} else if ($thisObj.text() === "" && _humanMovesCount < 3) {
						_humanMoves.moveToSq($thisObj);
					}
				}

			});
		};

		var startGame = function(humanPawn) {
			$(".message").removeClass('hide');
			$(".ai").removeClass('hide');

			socket.emit('do-task', {
				messageType: 'start-game',
				level: _logistics.settings.level
			});

			if (humanPawn === 'X') {
				_humanMoves.startHumanMove(board);
			} else {
				_computerMoves.startComputerMove();
			}
		};
		socket.on('reset', function() {
			_gameOver.restartGame();
		});

		socket.on('message', function(e) {
			switch (e.messageType) {
				case 'computer-move-done':
					var oldRow = e.oldRow;
					var oldCol = e.oldCol;
					var newRow = e.newRow;
					var newCol = e.newCol;

					_moves.recordMove(oldRow, oldCol, newRow, newCol, 'computer');
					_moves.displayMove(oldRow, oldCol, newRow, newCol, 'computer');

					break;

				case 'game-over':
					_gameOver.showWinner(e.winner);

					var winningPawns = e.pawns;

					winningPawns.forEach(function(pawn) {
						pawn = JSON.parse("[" + pawn + "]");
						var row = pawn[0];
						var col = pawn[1];
						_moves.markCells(row, col, "selected");
					});

					_gameOver.showEndGameMessage();

					break;

				case 'avail-human-pos':
					var allAvailPosArr = e.allPos;
					_humanMoves.startHumanMove(allAvailPosArr);
					break;
			}
		});

		var _gameOver = {
			restartGame: function() {
				$(".restart").click(function() {

					socket.emit('do-task', {
						messageType: 'restart'
					});
					_logistics.resetSettings();

					_moves.clearGrid();
					_humanMovesCount = 0;
					displayPage(allPages.page2Class);

				});
			},
			showEndGameMessage: function() {

				$(".restart").removeClass('hide');
				_gameOver.restartGame();
			},
			showWinner: function(winner) {

				if (winner === "computer") {
					$(".message").text(messages["computer-win"]);

				} else {
					$(".message").text(messages["human-win"]);
				}
			}
		};

		var loadEverything = function() {
			displayPage(allPages.page1Class);
			setUpAllListeners();

		};
		return {
			intoAnimations: loadEverything(),
			turnOnGrid: gridListenerOn()
		};
		
	})();
});