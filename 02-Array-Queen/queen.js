/**
 * Simple program to solve the queen problem.
 * Shining Yang <y.s.n@live.com>, 2014-12-27
 */

var Queen = function(n) {
	this.NO = 0; // No. of solution/placement
	this.N = n;
	this.placements = new Array(n * n);
	for (var i = 0; i < n * n; i++) {
		this.placements[i] = false;
	}
	this._conflictVertically = function(r, c) {
		for (var i = 0; i < r; i++) {
			if (this.placements[i * this.N + c]) {
				return true;
			}
		}
		return false;
	};
	this._conflictDiagonally = function(r, c) {
		var i, j;
		for (i = r - 1, j = c - 1; i >= 0 && j >= 0; i--, j--) {
			if (this.placements[i * this.N + j]) {
				return true;
			}
		}
		for (i = r - 1, j = c + 1; i >= 0 && j < this.N; i--, j++) {
			if (this.placements[i * this.N + j]) {
				return true;
			}
		}
		return false;
	};
	this._printQueens = function() {
		for (var i = 0; i < this.N; i++) {
			for (var j = 0; j < this.N; j++) {
				var ch = this.placements[i * this.N + j] ? 'Q' : '.';
				process.stdout.write(ch);
			}
			console.log(' ');
		}
	};
	this._tryToPlace = function(row) {
		if (row === this.N) {
			console.log('Solution NO: ', ++this._NO);
			this._printQueens();
			console.log(' ');
		} else {
			for (var col = 0; col < this.N; col++) {
				if (!this._conflictVertically(row, col) && !this._conflictDiagonally(row, col)) {
					this.placements[row * this.N + col] = true;
					this._tryToPlace(row + 1);
					this.placements[row * this.N + col] = false;
				}
			}
		}
	};
	this.Place = function() {
		this._NO = 0;
		this._tryToPlace(0);
	};
};

module.exports = Queen;
		   	   
