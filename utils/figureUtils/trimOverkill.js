export const trimOverkill = (el, dec = 2) => {
	if (el === 0) return el
	if (dec === 0) return Math.round(el)
	const el_ = el
	let el__ = String(el_)
	if (el__.includes('e+')) {
		return Number(el__)
	}
	const dp_ = String(el_).includes('.')
		? String(el_).slice(String(el_).indexOf('.') + 1)
		: ''
	const dpLen = dp_?.length
	if (dec > dpLen && dpLen) {
		const original = dp_
			.split('')
			.reverse()
			.map((el) => Number(el))
		original.reduce((i, el, x) => {
			el = Number(el)
			if ((i ?? 0) > 4 && el === 9) {
				original[x] = 0
				return -1
			} else if (i === -1) {
				if (el === 9) {
					original[x] = 0
					return -1
				} else {
					original[x] = el + 1
					return el
				}
			}
		}, 0)
		const dp = original.reverse().join('')
		const ret = String(el_)
			.slice(0, String(el_).indexOf('.') + 1)
			.concat(dp)
		return Number(ret)
	} else if (!dpLen) {
		return el_
	}
	let strDp = '0.'.concat(dp_)
	if (el_ < 0) strDp = '-'.concat(strDp)
	if (strDp.includes('e-')) {
		count = Number(strDp.slice(strDp.lastIndexOf('-') + 1)) - 1
		const x = strDp.split('')
		const valid = x
			.filter((el) => !isNaN(el))
			.map((el) => Number(el))
			.join('')
		strDp = '0'.repeat(count).concat(valid)
		strDp = '0.'.concat(strDp)
		if (el < 0) strDp = '-'.concat(strDp)
	}
	const dP1 = dec + (el_ > 0 ? 1 : 2),
		dP2 = dec + (el_ > 0 ? 2 : 3)
	const strDPLen = strDp.length
	const sSDP1 = Number(strDp[dP1])
	let original = []
	let snap = []
	let newArray = []
	let sSDP2 = 0
	if (strDPLen > dP2) {
		const excess = strDp.slice(dP2 + 1).split('')
		const fS = excess.findIndex((el) => Number(el) <= 3)
		const wrap = excess.slice(0, fS === -1 ? undefined : fS).reverse()
		const increment = wrap.reduce((increment, thisElement) => {
			const resolved = Number(increment) + Number(thisElement)
			return resolved > 4 ? 1 : 0
		}, 0)
		sSDP2 = Number(strDp[dP2]) + increment
		const oFS = strDp.indexOf('.')
		original = strDp
			.slice(oFS + 1, dP2)
			.split('')
			.reverse()
		snap = original.map((el) => Number(el))
		snap.reverse()
		newArray = []
		if (sSDP2 > 4) {
			if (sSDP1 === 9) {
				original.reduce((i, el, x) => {
					el = Number(el)
					if (i > 4 && el === 9) {
						original[x] = 0
						newArray.unshift(0)
						return -1
					} else if (i === -1) {
						if (el === 9) {
							original[x] = 0
							newArray.unshift(0)
							return -1
						} else {
							original[x] = el + 1
							newArray.unshift(el + 1)
							return el
						}
					}
				}, sSDP2)
			} else {
				original[0] = Number(original[0]) + 1
			}
		}
		original.reverse()
		if (sSDP1 === sSDP2) {
			strDp = strDp
				.substring(0, dP1)
				.concat(Number(sSDP2) > 4 ? Number(sSDP1) + 1 : sSDP1)
		} else if (sSDP2 > sSDP1) {
			let string = strDp
				.slice(0, dP1)
				.concat(Number(sSDP1) + (sSDP2 > 4 ? 1 : 0))
			strDp = string
		}
	} else {
		original = dp_.split('').map((el) => Number(el))
		newArray = [...original]
		snap = [...original]
	}
	let str = String(el_).slice(0, String(el_).indexOf('.'))
	const addOne =
		sSDP2 > 4 && snap?.length ? snap.every((el) => Number(el) === 9) : false
	str = String(Number(str) + (addOne ? (el < 1 ? -1 : 1) : 0))
	const allZeroes = newArray?.length
		? newArray.every((el) => Number(el) === 0)
		: false
	const dp = allZeroes ? '' : '.'.concat(original.join(''))
	str += dp
	const returnValue =
		el_ < 0 && el_ - (el_ % 1) === 0 ? Number(str) * -1 : Number(str)
	return returnValue
}
