type union = 'a' | 'b';

function genericThing<T extends string>(t: T) {
	console.log(t);
}

genericThing<union>('a');
