from json import (loads, dumps)
import RPi.GPIO as GPIO
from time import sleep
from sys import exit
from signal import (signal, SIGINT)

import pn532.pn532 as mifare
from pn532 import PN532_SPI
from helpers import getAccessBits

from websocket import create_connection


with open("./config.json") as f:
  config = loads(f.read())

reader = PN532_SPI(cs=4, reset=20, debug=False)
ic, ver, rev, support = reader.get_firmware_version()
print('PN532 reader connected with firmware version: {0}.{1}'.format(ver, rev))
reader.SAM_configuration()

wsParams = config["connection"]["ws"]
connstring = "ws{}://{}:{}/{}".format("s" if wsParams["encrypt"] else "", wsParams["host"], wsParams["port"], wsParams["path"])
ws = create_connection(connstring, timeout=1)

ws.send(dumps({"cmd": 0, "secret": wsParams["secret"], "ID": 0}))

try:
  ws.recv()
except:
  pass

if not ws.connected:
  raise Exception("Invalid secret provided, cannot connect to server!")

def shutdown(signal, frame):
  print("\nExiting program!")
  ws.close()
  GPIO.cleanup()
  exit(0)
signal(SIGINT, shutdown)

while True:
  while True:
    uid = reader.read_passive_target(timeout=1)
    if uid is not None:
      break
  print('Found card with UID:', [hex(i) for i in uid])

  try:
    KEY = b'\xFF\xFF\xFF\xFF\xFF\xFF'
    BLOCKNUM = 1
    reader.mifare_classic_authenticate_block(uid, block_number=BLOCKNUM, key_number=mifare.MIFARE_CMD_AUTH_A, key=KEY)

    tag = bytearray()
    tag += reader.mifare_classic_read_block(1)
    tag += reader.mifare_classic_read_block(2)

    tagInts = [v for v in tag]

    ws.send(dumps({"cmd": 1, "tag": tagInts}))

    resp = loads(ws.recv())
    if resp["tag"] == tagInts:
      print(resp["correct"]) # kinyitni / nem
    sleep(2)

  except mifare.PN532Error as e:
    print(e.errmsg)
  except TypeError:
    print("Card removed too quickly, could not read!") # hibát visszajelezni