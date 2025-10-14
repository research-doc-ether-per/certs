private fun extractBitValue(
    bytes: ByteArray,
    index: ULong,
    bitSize: UInt
): List<Char> {
    val totalBits = bytes.size * 8
    val startBit = (index * bitSize.toULong()).toInt()
    val endBit = startBit + bitSize.toInt()

    require(endBit <= totalBits) {
        "Encoded list shorter than declared window: need bits [$startBit..${endBit - 1}], available 0..${totalBits - 1} (bytes=${bytes.size})"
    }

    // bitSize が小さいので CharArray で十分、toList() のほうが安全
    val result = CharArray(bitSize.toInt()) { i ->
        val bitPos = startBit + i
        val byteIndex = bitPos ushr 3
        val shift = 7 - (bitPos and 7)
        val bit = (bytes[byteIndex].toInt() shr shift) and 1
        if (bit == 1) '1' else '0'
    }
    return result.toList()
}
