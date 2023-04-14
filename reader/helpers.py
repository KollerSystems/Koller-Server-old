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


from websocket import create_connection

class Comms:
  def __init__(self, connParams):
    connTypes = ("ws",)
    for conn in connTypes:
      setattr(self, conn, False)

    if connParams["prefer"] not in connTypes:
      raise Exception(f"That method of communication is not yet implemented!")

    if connParams["prefer"] == "ws":
      wsParams = connParams["ws"]
      self.commClass = self._initWS(wsParams["encrypt"], wsParams["host"], wsParams["port"], wsParams["path"])
      self.ws = True
  def _initWS(self, encrypt, host, port, path):
    connstring = "ws{}://{}:{}/{}".format("s" if encrypt else "", host, port, path)
    ws = create_connection(connstring)
    return ws

  def send(self, data):
    if self.ws:
      return self._sendWS(data)
  def _sendWS(self, data):
    return self.commClass.send(data)

  def read(self):
    if self.ws:
      return self._readWS()
  def _readWS(self):
    return self.commClass.recv()

  def close(self):
    if self.ws:
      return self._closeWS()
  def _closeWS(self):
    return self.commClass.close()