function BubbleSort(a, n) {
	var i, j;
	var swapped;
	for (i = n - 1; i > 0; i--) {
		swapped = false;
		for (j = 0; j < i; j++) {
			if (a[j] > a[j + 1]) {
				var x = a[j];
				a[j] = a[j + 1];
				a[j + 1] = x;
				swapped = true;
			}
		}
		if (!swapped) { // already sorted
			break;
		}
	}
};

exports.sort = BubbleSort;
