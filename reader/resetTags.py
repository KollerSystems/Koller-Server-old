from json import loads

import RPi.GPIO as GPIO
import pn532.pn532 as mifare
from pn532 import PN532_SPI
from helpers import getAccessBits

with open("./config.json") as f:
  config = loads(f.read())

reader = PN532_SPI(cs=4, reset=20, debug=False)
ic, ver, rev, support = reader.get_firmware_version()
print('PN532 reader connected with firmware version: {0}.{1}'.format(ver, rev))
reader.SAM_configuration()

KEY_B = bytearray([ord(c) for c in config["keys"]["B"]])

print('KEY B is', ':'.join(['%02X' % x for x in KEY_B]))
print("Card data will be erased, and will be placed into transport configuration!")

zeroed = bytearray("".ljust(16, chr(0)), encoding="ASCII")
transportKey = b'\xFF\xFF\xFF\xFF\xFF\xFF'

lastUID = -1
try:
  while True:
    while True:
      uid = reader.read_passive_target(timeout=0.5)
      if (uid is not None) and uid != lastUID:
        break
    print('Found card with UID:', [hex(i) for i in uid])

    if uid == lastUID:
      continue
    for block in range(1,64):
      try:
        reader.mifare_classic_authenticate_block(uid, block_number=block, key_number=mifare.MIFARE_CMD_AUTH_B, key=KEY_B)
        if block % 4 == 3:
          reader.mifare_classic_write_block(block, transportKey + bytearray(getAccessBits([0,0,0,1])) + b'\x69' + transportKey)
        else:
          reader.mifare_classic_write_block(block, zeroed)
      except:
        print(f"Invalid key provided for writing block {block}")

    lastUID = uid
    print("Finished erasing tag!")
except KeyboardInterrupt:
  pass

GPIO.cleanup()