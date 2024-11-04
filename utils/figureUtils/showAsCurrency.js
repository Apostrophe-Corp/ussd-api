import { currencyFormat } from './currencyFormat'
import { trimOverkill } from './trimOverkill'
import { nFormatter } from './nFormatter'

export function showAsCurrency({
	val = 0,
	digits = 0,
	depth = 1e6,
	blankDecimals = false,
}) {
	const f =
		val < 1 ? trimOverkill(val ?? 0, digits) : nFormatter(val, digits, depth)
	const c = isNaN(f)
		? f
		: f >= 1
		? currencyFormat(f, blankDecimals, digits)
		: trimOverkill(f, digits)

	return c
}
