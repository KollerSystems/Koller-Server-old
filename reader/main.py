from json import loads
import RPi.GPIO as GPIO

import pn532.pn532 as mifare
from pn532 import PN532_SPI
from helpers import getAccessBits

from helpers import Comms

with open("./config.json") as f:
  config = loads(f.read())

reader = PN532_SPI(cs=4, reset=20, debug=False)
ic, ver, rev, support = reader.get_firmware_version()
print('PN532 reader connected with firmware version: {0}.{1}'.format(ver, rev))
reader.SAM_configuration()

comm = Comms(config["connection"])


while True:
  while True:
    uid = reader.read_passive_target(timeout=0.5)
    if uid is not None:
      break
  print('Found card with UID:', [hex(i) for i in uid])

  try:
    KEY = b'\xFF\xFF\xFF\xFF\xFF\xFF'
    BLOCKNUM = 1
    reader.mifare_classic_authenticate_block(uid, block_number=BLOCKNUM, key_number=mifare.MIFARE_CMD_AUTH_A, key=KEY)

    # block = bytearray("".ljust(16, chr(0)), encoding="ASCII")
    # block = b'\xFF\xFF\xFF\xFF\xFF\xFF' + bytearray(getAccessBits([4,4,4,3])) + b'\x69' + b'\xFF\xFF\xFF\xFF\xFF\xFF'
    # reader.mifare_classic_write_block(BLOCKNUM, block)

    for i in range(0,4):
      print(' '.join(['%02X' % x for x in reader.mifare_classic_read_block(i)]))
      # print(reader.mifare_classic_read_block(i))
    break
  except mifare.PN532Error as e:
    print(e.errmsg)


comm.close()
GPIO.cleanup()