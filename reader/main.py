import RPi.GPIO as GPIO
import pn532.pn532 as nfc
from pn532 import *
from accessbitcalc import getAccessBits

pn532 = PN532_SPI(cs=4, reset=20, debug=False)

ic, ver, rev, support = pn532.get_firmware_version()
print('Found PN532 with firmware version: {0}.{1}'.format(ver, rev))

pn532.SAM_configuration()

while True:
  while True:
    uid = pn532.read_passive_target(timeout=0.5)
    if uid is not None:
      break
  print('Found card with UID:', [hex(i) for i in uid])

  try:
    KEY = b'\xFF\xFF\xFF\xFF\xFF\xFF'
    BLOCKNUM = 1
    pn532.mifare_classic_authenticate_block(uid, block_number=BLOCKNUM, key_number=nfc.MIFARE_CMD_AUTH_A, key=KEY)

    block = bytearray("".ljust(16, chr(0)), encoding="ASCII")
    # block = b'\xFF\xFF\xFF\xFF\xFF\xFF' + bytearray(getAccessBits([4,4,4,3])) + b'\x69' + b'\xFF\xFF\xFF\xFF\xFF\xFF'
    pn532.mifare_classic_write_block(BLOCKNUM, block)

    for i in range(0,4):
      print(' '.join(['%02X' % x for x in pn532.mifare_classic_read_block(i)]))
    break
  except nfc.PN532Error as e:
    print(e.errmsg)

GPIO.cleanup()