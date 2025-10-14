
private fun extractBitValue(
    bytes: ByteArray,
    index: ULong,      
    bitSize: UInt       
): List<Char> {
    val totalBits = bytes.size * 8

    val startBitLong = (index.toLong() * bitSize.toLong())
    val sizeLong = bitSize.toLong()

    require(startBitLong + sizeLong <= totalBits.toLong()) {
        "Encoded list shorter than declared window: need bits [${startBitLong}..${startBitLong + sizeLong - 1}], " +
        "but available is 0..${totalBits - 1} (bytes=${bytes.size})"
    }

    val out = CharArray(bitSize.toInt())
    var bitPos = startBitLong.toInt()
    var i = 0
    while (i < out.size) {
        val byteIndex = bitPos / 8
        val shift = 7 - (bitPos % 8)
        val b = bytes[byteIndex].toInt() and 0xFF
        val bit = (b shr shift) and 1
        out[i] = if (bit == 1) '1' else '0'
        i++
        bitPos++
    }
    return out.asList()
}

