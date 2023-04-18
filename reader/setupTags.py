from json import loads
from os.path import exists
import csv

import RPi.GPIO as GPIO
import pn532.pn532 as mifare
from pn532 import PN532_SPI
from helpers import getAccessBits

path = input("Path to CSV file containing keys: ")
if not exists(path):
  raise Exception("Specified file does not exist!")

with open("./config.json") as f:
  config = loads(f.read())

reader = PN532_SPI(cs=4, reset=20, debug=False)
ic, ver, rev, support = reader.get_firmware_version()
print('PN532 reader connected with firmware version: {0}.{1}'.format(ver, rev))
reader.SAM_configuration()

KEY_A = bytearray([ord(c) for c in config["keys"]["A"]])
KEY_B = bytearray([ord(c) for c in config["keys"]["B"]])

print('KEY A is', ':'.join(['%02X' % x for x in KEY_A]))
print('KEY B is', ':'.join(['%02X' % x for x in KEY_B]))
print("First sector will have access rights 4,4,4,3, others 3,3,3,3!")

KEY = b'\xFF\xFF\xFF\xFF\xFF\xFF'

lastUID = -1
try:
  f = open(path, 'r')
  rdr = csv.reader(f)
  for tag in rdr:
    while True:
      uid = reader.read_passive_target(timeout=0.5)
      if (uid is not None) and uid != lastUID:
        break
    print('Found card with UID:', [hex(i) for i in uid])

    if lastUID == uid:
      continue

    # első, a belépési információt tartalmazó szektor beállítása
    block = KEY_A + bytearray(getAccessBits([4,4,4,3])) + b'\x69' + KEY_B
    try:
      reader.mifare_classic_authenticate_block(uid, block_number=1, key_number=mifare.MIFARE_CMD_AUTH_A, key=KEY)
      reader.mifare_classic_write_block(1, [int(t) for t in tag[:16]])
      reader.mifare_classic_write_block(2, [int(t) for t in tag[16:]])
      reader.mifare_classic_write_block(3, block)
    except:
      raise Exception("Card is not in transport configuration!")

    # többi, használatlan szektor beállítása
    for sector in range(1,16):
      blockN = sector * 4 + 3

      block = KEY_A + bytearray(getAccessBits([3,3,3,3])) + b'\x69' + KEY_B
      try:
        reader.mifare_classic_authenticate_block(uid, block_number=blockN, key_number=mifare.MIFARE_CMD_AUTH_A, key=KEY)
        reader.mifare_classic_write_block(blockN, block)
      except:
        print(f"Card is not in transport configuration! Skipping sector {sector}")
        continue

    lastUID = uid
    print("Tag writing finished!")
except KeyboardInterrupt:
  pass

GPIO.cleanup()