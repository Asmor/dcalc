document.addEventListener("DOMContentLoaded", () => {
	Array.from(document.querySelectorAll(".key")).forEach(button => {
		button.addEventListener("click", () => hitKey(button.getAttribute("data-key")))
	});

	updateInput();
});

document.addEventListener("keypress", (evt) => {
	let key = evt.key.toLowerCase();

	if ( key === "=" ) {
		// Treat = as + because they're the same key
		key = "+";
	}

	if ( key.match(/^[-+\ddkrxhml]$/) ) {
		input += key;
		updateInput();
	} else if ( key === "enter" ) {
		execute();
	} else if (key === "delete") {
		del();
	}

	return false;
});

let input = "";
let translate = {
	plus: "+",
	minus: "-",
};

function hitKey(which) {
	if ( which === "clear" ) {
		if ( input ) {
			input = ""
		} else {
			updateOutput({ clear: true });
		}
	} else if ( which === "enter" ) {
		execute();
	} else if ( which === "delete" ) {
		del();
	} else if ( which === "help" ) {
		console.log("Help not yet implemented");
	} else {
		input += translate[which] || which;
	}

	updateInput();
}

function execute() {
	let result = crunch(input);
	updateOutput({result});
	// input = "";
}

function del() {
	input = input.substr(0, input.length -1);
	updateInput();
}

function updateInput() {
	document.querySelector(".input").innerHTML = input;
}

function updateOutput({clear, result}) {
	let history = document.querySelector(".history");

	if ( clear ) {
		let fc;
		while ( fc = history.firstChild ) {
			history.removeChild(fc);
		}
	}

	if ( result ) {
		history.appendChild(generateResult(result));
	}

	history.scrollLeft = history.scrollWidth;
}

function generateResult(result) {
	console.log(result);
	let resultDiv = node({ className: "result" })

	let time = (new Date).toLocaleTimeString();

	resultDiv.appendChild(
		node({ type: "span", className: "result--time", contents: `[${time}] ` })
	);

	resultDiv.appendChild(
		node({ type: "span", className: "result--expression", contents: result.expression })
	);

	let secondLine = node({ className: "result--explanation" });
	resultDiv.appendChild(secondLine);

	secondLine.appendChild(node({ type: "span", className: "result--sum", contents: result.sum }));
	secondLine.appendChild(document.createTextNode(" = "));
	result.groups.forEach(group => {
		console.log(group);
		window.group = group;
		let rolls = group.rolls.join(", ");
		secondLine.appendChild(document.createTextNode(` ${group.sum} [${group.expression}: ${rolls}] `));
	});

	return resultDiv;
}

function node({type, className, contents}) {
	type = type || "div";
	console.log({type, className, contents});

	let el = document.createElement(type);

	if ( className ) {
		el.classList.add(className);
	}

	if ( contents ) {
		el.innerHTML = contents;
	}

	return el;
}

function crunch(input) {
	let matches = input.match(/[-+]?(\d*d\d+(x|[kr]\d*[hml]?)?|\d+)/g);
	if ( matches.join("") !== input ) {
		console.warn("Bad match", matches.join(""));
	}

	let groups = matches.map(m => {
		if ( m.match(/^[-+]?\d+$/) ) {
			return simpleNumber(m);
		} else {
			return diceRoll(m);
		}
	});

	let sum = groups.reduce((acc, n) => {return acc+n.sum}, 0);

	return {
		groups,
		expression: input,
		sum,
	};
}

function simpleNumber(s) {
	let parts = s.match(/([-+]?)(\d+)/);
	let sign = parts[1];
	let number = Number.parseInt(parts[2]);

	if ( sign === "-" ) {
		number *= -1;
	}

	return {
		sum: number,
		rolls: [number],
		expression: s,
	};
}

function diceRoll(s) {
	let parts = s.match(/([-+]?)(\d*)d(\d+)(?:(x)|(?:(k)|(r))(\d*)([hml]?))?/)
	let sign = parts[1];
	let count = Number.parseInt(parts[2] || 1);
	let size = Number.parseInt(parts[3]);
	let exploding = parts[4];
	let keep = parts[5];
	let drop = parts[6];
	let keepOrDropAmt = Number.parseInt(parts[7] || 1);
	let keepOrDropWhere = parts[8];

	let rolls = [];
	let i = 0;
	let sum = 0;
	while (i < count) {
		let roll = d(size);
		sum += roll;
		rolls.push(roll);

		if ( !(exploding && roll === size) ) {
			i++;
		}
	}

	if ( keep || drop ) {
		rolls.sort((a,b) => a-b);

		if ( !keepOrDropWhere ) {
			// Keep defaults to keeping highest; drop defaults to dropping lowest
			if ( keep ) {
				keepOrDropWhere = "h";
			} else {
				keepOrDropWhere = "l";
			}

		}

		let rangeStart = 0;
		let rangeEnd = rolls.length;

		if ( keepOrDropWhere === "h" ) {
			rangeStart = rolls.length - keepOrDropAmt;
		} else if ( keepOrDropWhere === "l" ) {
			rangeEnd = keepOrDropAmt;
		} else {
			let size = rolls.length - keepOrDropAmt;
			rangeStart = Math.floor(size / 2);
			rangeEnd = rangeStart + keepOrDropAmt;
		}

		let subsetValue = rolls.slice(rangeStart, rangeEnd).reduce((acc, n) => { return acc + n }, 0);

		if ( keep ) {
			sum = subsetValue;
		} else {
			// drop
			sum -= subsetValue;
		}
	}

	if ( sign === "-" ) {
		sum *= -1;
	}

	return { sum, rolls, expression: s };
}

function d(n) {
	return Math.floor(Math.random() * n) + 1;
}
