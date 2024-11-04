import { trimOverkill } from './trimOverkill'

/**
 * Formats a given number to currency format
 * @param {number} _n number
 * @param {boolean} _ad add blank decimals
 * @param {number} _d decimal count
 * @returns string  value of the formatted number or a rounded number if no decimal count is given
 */
export const currencyFormat = (_n, _ad = true, _d = 2) => {
	let _sn = String(trimOverkill(_n, _d)),
		_3 = 3,
		_0 = 0
	let pSn = _sn.slice(0, _sn.indexOf('.') === -1 ? undefined : _sn.indexOf('.'))
	let _snl = String(pSn).length
	const _nm3 = Math.floor(_snl / _3)
	if (_nm3) {
		_snl -= _3
		for (_snl; _snl > _0; _snl -= _3) {
			if (_nm3 !== _0) {
				const _ = pSn.slice(_0, _snl)
				const __ = pSn.slice(_snl)
				pSn = `${_},${__}`
			}
		}
	}
	const dp_ = _sn.includes('.') ? _sn.slice(_sn.indexOf('.') + 1) : ''
	const ret = `${pSn}${dp_ === '' && _ad ? '.00' : dp_ ? `.${dp_}` : ''}`
	return ret
}
