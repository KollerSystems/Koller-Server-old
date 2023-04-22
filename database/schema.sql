-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Szerver verzió:               10.10.3-MariaDB - mariadb.org binary distribution
-- Szerver OS:                   Win64
-- HeidiSQL Verzió:              11.3.0.6295
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Adatbázis struktúra mentése a kollegium.
CREATE DATABASE IF NOT EXISTS `kollegium` /*!40100 DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci */;
USE `kollegium`;

-- Struktúra mentése tábla kollegium. auth
CREATE TABLE IF NOT EXISTS `auth` (
  `ID` varchar(12) DEFAULT NULL,
  `access_token` varchar(32) DEFAULT NULL,
  `refresh_token` varchar(32) DEFAULT NULL,
  `expires` int(10) unsigned DEFAULT NULL,
  `issued` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expired` bit(1) NOT NULL DEFAULT b'0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. crossings
CREATE TABLE IF NOT EXISTS `crossings` (
  `ID` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `PID` int(15) unsigned NOT NULL,
  `Time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `Direction` bit(1) NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. def_times
CREATE TABLE IF NOT EXISTS `def_times` (
  `dayTimeStart` int(10) unsigned DEFAULT NULL,
  `dayTimeGoInside` int(10) unsigned DEFAULT NULL,
  `nightTimeGoInside1` int(10) unsigned DEFAULT NULL,
  `nightTimeGoInside2` int(10) unsigned DEFAULT NULL,
  `nightTimeGoInside3` int(10) unsigned DEFAULT NULL,
  `nightTimeEnd` int(10) unsigned DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. login_data
CREATE TABLE IF NOT EXISTS `login_data` (
  `GID` int(20) unsigned NOT NULL,
  `Username` text DEFAULT NULL,
  `Password` text DEFAULT NULL,
  PRIMARY KEY (`GID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. mifare_tags
CREATE TABLE IF NOT EXISTS `mifare_tags` (
  `PID` int(15) unsigned NOT NULL,
  `Issued` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `Bytes` tinyblob NOT NULL,
  PRIMARY KEY (`Bytes`(32))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. notes
CREATE TABLE IF NOT EXISTS `notes` (
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `TID` int(11) unsigned DEFAULT NULL,
  `SID` int(11) unsigned DEFAULT NULL,
  `Category` tinyint(3) unsigned DEFAULT NULL,
  `Type` tinyint(3) unsigned DEFAULT NULL,
  `Title` tinytext DEFAULT NULL,
  `Description` text DEFAULT NULL,
  `Time` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. notes_types
CREATE TABLE IF NOT EXISTS `notes_types` (
  `Category` tinyint(3) unsigned DEFAULT NULL,
  `Name` tinytext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `Role` tinyint(1) NOT NULL,
  `Table` varchar(64) NOT NULL,
  `Field` varchar(64) NOT NULL,
  `Read` bit(1) NOT NULL DEFAULT b'0',
  `Write` bit(1) NOT NULL DEFAULT b'0',
  KEY `Table` (`Table`,`Field`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `route_access` (
  `Role` tinyint(1) NOT NULL,
  `Route` varchar(128) NOT NULL,
  `Accessible` bit(1) NOT NULL DEFAULT b'0',
  `Hide` bit(1) NOT NULL DEFAULT b'0',
  KEY `Access` (`Role`,`Route`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. peroutgoing
CREATE TABLE IF NOT EXISTS `peroutgoing` (
  `SID` int(10) unsigned NOT NULL DEFAULT 0,
  `TID` int(10) unsigned DEFAULT NULL,
  `Day` tinyint(4) DEFAULT NULL,
  `StartTime` time DEFAULT NULL,
  `EndTime` time DEFAULT NULL,
  KEY `Index 1` (`SID`,`StartTime`,`EndTime`,`Day`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. praises
CREATE TABLE IF NOT EXISTS `praises` (
  `ID` int(11) NOT NULL,
  `Type` tinytext NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. role_name
CREATE TABLE IF NOT EXISTS `role_name` (
  `Role` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `Table` varchar(64) NOT NULL,
  `FullName` text DEFAULT NULL,
  PRIMARY KEY (`Role`),
  KEY `Table` (`Table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. roomorder
CREATE TABLE IF NOT EXISTS `roomorder` (
  `ID` int(15) NOT NULL AUTO_INCREMENT,
  `TID` int(11) unsigned DEFAULT NULL,
  `RoomNumber` smallint(6) unsigned DEFAULT NULL,
  `Time` datetime DEFAULT NULL,
  `Floor` tinyint(4) DEFAULT NULL,
  `Windows` binary(2) DEFAULT NULL,
  `Beds` tinyint(4) unsigned DEFAULT NULL,
  `Depower` binary(2) DEFAULT NULL,
  `Table` tinyint(4) unsigned DEFAULT NULL,
  `Fridge` tinyint(4) unsigned DEFAULT NULL,
  `Trash` binary(2) DEFAULT NULL,
  `Air` tinyint(4) unsigned DEFAULT NULL,
  `Shelves` tinyint(4) unsigned DEFAULT NULL,
  `Tidiness` tinyint(4) unsigned DEFAULT NULL,
  `Unwashed` binary(2) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. student
CREATE TABLE IF NOT EXISTS `student` (
  `ID` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `OM` varchar(11) DEFAULT NULL,
  `Name` text DEFAULT NULL,
  `Picture` longblob DEFAULT NULL,
  `Group` tinytext DEFAULT NULL,
  `Class` tinytext DEFAULT NULL,
  `School` text DEFAULT NULL,
  `Birthplace` text DEFAULT NULL,
  `Birthdate` date DEFAULT NULL,
  `GuardianName` text DEFAULT NULL,
  `GuardianPhone` varchar(50) DEFAULT NULL,
  `RoomNumber` smallint(5) unsigned DEFAULT NULL,
  `Country` text DEFAULT NULL,
  `City` text DEFAULT NULL,
  `Street` text DEFAULT NULL,
  `PostCode` int(11) unsigned DEFAULT NULL,
  `Address` int(10) unsigned DEFAULT NULL,
  `Floor` int(11) unsigned DEFAULT NULL,
  `Door` int(11) unsigned DEFAULT NULL,
  `Discord` tinytext DEFAULT NULL,
  `Facebook` tinytext DEFAULT NULL,
  `Instagram` tinytext DEFAULT NULL,
  `Email` tinytext DEFAULT NULL,
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. teacher
CREATE TABLE IF NOT EXISTS `teacher` (
  `ID` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `Name` text DEFAULT NULL,
  `OM` varchar(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. user
CREATE TABLE IF NOT EXISTS `user` (
  `GID` int(20) unsigned NOT NULL AUTO_INCREMENT,
  `ID` int(15) unsigned DEFAULT NULL,
  `Role` tinyint(1) unsigned DEFAULT 0,
  PRIMARY KEY (`GID`),
  KEY `ID` (`ID`,`Role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

-- Struktúra mentése tábla kollegium. warnings
CREATE TABLE IF NOT EXISTS `warnings` (
  `ID` int(11) NOT NULL,
  `Type` tinytext NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Az adatok exportálása nem lett kiválasztva.

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
