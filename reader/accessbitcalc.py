def getBit(value, C, complemented):
  bitFilter = 2**(3-C)
  bit = (value & bitFilter) >> (3-C)
  return (0 if bit else 1) if complemented else bit


def getBitChain(bits, C, complemented):
  halfByte = 0
  for i in range(len(bits)-1, -1, -1):
    halfByte = (halfByte << 1) + getBit(bits[i], C, complemented)
  return halfByte

def getByte(bits, C1, C2, complement1, complement2):
  return (getBitChain(bits, C1, complement1) << 4) + (getBitChain(bits, C2, complement2))

def getAccessBits(values):
  order = [
    [(2,True),(1,True)],
    [(1,False),(3,True)],
    [(3, False),(2,False)]
  ]
  bytes = []
  for byteInfo in order:
    bytes.append(getByte(values, byteInfo[0][0], byteInfo[1][0], byteInfo[0][1], byteInfo[1][1]))
  return bytes