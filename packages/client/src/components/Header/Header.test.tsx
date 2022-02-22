import { h } from 'preact';
import Header from './Header';
// See: https://github.com/preactjs/enzyme-adapter-preact-pure
import { shallow } from 'enzyme';

describe('Initial Test of the Header', () => {
	test('Header renders 2 nav items', () => {
		const context = shallow(<Header />);
		expect(context.find('h1').text()).toBe('IOT-SEC');
		expect(context.find('Link').length).toBe(2);
	});
});
