/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


CREATE DATABASE IF NOT EXISTS `kollegium`;
USE `kollegium`;

CREATE TABLE IF NOT EXISTS `auth` (
  `UID` int(15) unsigned NOT NULL,
  `access_token` varchar(32) DEFAULT NULL,
  `refresh_token` varchar(32) DEFAULT NULL,
  `expires` int(10) unsigned DEFAULT NULL,
  `issued` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expired` bit(1) NOT NULL DEFAULT b'0',
  FOREIGN KEY (`UID`) REFERENCES user(`UID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `crossings` (
  `ID` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `UID` int(15) unsigned NOT NULL,
  `Time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `Direction` bit(1) NOT NULL,
  PRIMARY KEY (`ID`),
  FOREIGN KEY (`UID`) REFERENCES user(`UID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `login_data` (
  `UID` int(15) unsigned NOT NULL,
  `Username` text DEFAULT NULL,
  `Password` text DEFAULT NULL,
  PRIMARY KEY (`UID`) USING BTREE,
  FOREIGN KEY (`UID`) REFERENCES user(`UID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `mifare_tags` (
  `UID` int(15) unsigned NOT NULL,
  `Issued` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `Bytes` tinyblob NOT NULL,
  PRIMARY KEY (`Bytes`(32)),
  FOREIGN KEY (`UID`) REFERENCES user(`UID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `notes_types` (
  `Category` tinyint(3) unsigned DEFAULT NULL,
  `Name` tinytext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

CREATE TABLE IF NOT EXISTS `dormroom` (
  `RID` smallint(5) unsigned NOT NULL,
  `Gender` tinyint(1) unsigned DEFAULT NULL,
  `Group` varchar(4) DEFAULT NULL,
  PRIMARY KEY (`RID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `resident` (
  `UID` int(15) unsigned NOT NULL,
  `RID` smallint(5) unsigned NOT NULL,
  `BedNum` tinyint(1) unsigned DEFAULT NULL,
  PRIMARY KEY (`UID`),
  UNIQUE KEY RoomPosition (`RID`, `BedNum`),
  FOREIGN KEY (`UID`) REFERENCES user(`UID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `role_name` (
  `Role` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `Table` varchar(64) NOT NULL,
  `FullName` text DEFAULT NULL,
  PRIMARY KEY (`Role`),
  KEY `Table` (`Table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `roomorder` (
  `ID` int(15) NOT NULL AUTO_INCREMENT,
  `RatingTUID` int(15) unsigned DEFAULT NULL,
  `RID` smallint(5) unsigned NOT NULL,
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
  PRIMARY KEY (`ID`),
  FOREIGN KEY (`RatingTUID`) REFERENCES user(`UID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `student` (
  `UID` int(15) unsigned NOT NULL,
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
  `RID` smallint(5) unsigned NOT NULL,
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
  PRIMARY KEY (`UID`) USING BTREE,
  FOREIGN KEY (`UID`) REFERENCES user(`UID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `teacher` (
  `UID` int(15) unsigned NOT NULL,
  `Name` text DEFAULT NULL,
  `OM` varchar(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`UID`) USING BTREE,
  FOREIGN KEY (`UID`) REFERENCES user(`UID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `user` (
  `UID` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `Role` tinyint(1) unsigned DEFAULT 0,
  PRIMARY KEY (`UID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;


/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;