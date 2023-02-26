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

-- Tábla adatainak mentése kollegium.auth: ~0 rows (hozzávetőleg)
/*!40000 ALTER TABLE `auth` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth` ENABLE KEYS */;

-- Struktúra mentése tábla kollegium. crossings
CREATE TABLE IF NOT EXISTS `crossings` (
  `ID` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `SID` int(15) unsigned DEFAULT NULL,
  `Time` datetime DEFAULT NULL,
  `Direction` binary(2) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tábla adatainak mentése kollegium.crossings: ~0 rows (hozzávetőleg)
/*!40000 ALTER TABLE `crossings` DISABLE KEYS */;
/*!40000 ALTER TABLE `crossings` ENABLE KEYS */;

-- Struktúra mentése tábla kollegium. login_data
CREATE TABLE IF NOT EXISTS `login_data` (
  `GID` int(20) unsigned NOT NULL,
  `Username` text DEFAULT NULL,
  `Password` text DEFAULT NULL,
  PRIMARY KEY (`GID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tábla adatainak mentése kollegium.login_data: ~0 rows (hozzávetőleg)
/*!40000 ALTER TABLE `login_data` DISABLE KEYS */;
INSERT INTO `login_data` (`GID`, `Username`, `Password`) VALUES
	(1, 'Miki', 'almafa1234'),
	(2, 'Barnabás', 'almafa1234'),
	(3, 'Gyuri', 'almafa1234'),
	(4, 'Gergő', 'almafa1234');
/*!40000 ALTER TABLE `login_data` ENABLE KEYS */;

-- Struktúra mentése tábla kollegium. peroutgoing
CREATE TABLE IF NOT EXISTS `peroutgoing` (
  `SID` int(10) unsigned NOT NULL DEFAULT 0,
  `TID` int(10) unsigned DEFAULT NULL,
  `Day` tinyint(4) DEFAULT NULL,
  `StartTime` time DEFAULT NULL,
  `EndTime` time DEFAULT NULL,
  KEY `Index 1` (`SID`,`StartTime`,`EndTime`,`Day`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tábla adatainak mentése kollegium.peroutgoing: ~0 rows (hozzávetőleg)
/*!40000 ALTER TABLE `peroutgoing` DISABLE KEYS */;
/*!40000 ALTER TABLE `peroutgoing` ENABLE KEYS */;

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

-- Tábla adatainak mentése kollegium.roomorder: ~0 rows (hozzávetőleg)
/*!40000 ALTER TABLE `roomorder` DISABLE KEYS */;
/*!40000 ALTER TABLE `roomorder` ENABLE KEYS */;

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
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=4294967296 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tábla adatainak mentése kollegium.student: ~4 rows (hozzávetőleg)
/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT INTO `student` (`ID`, `OM`, `Name`, `Picture`, `Group`, `Class`, `School`, `Birthplace`, `Birthdate`, `GuardianName`, `GuardianPhone`, `RoomNumber`, `Country`, `City`, `Street`, `PostCode`, `Address`, `Floor`, `Door`) VALUES
	(1, '73454685362', 'Várnagy Miklós', NULL, 'F8', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2023-02-26', 'Papp Lajos', '36 64 865 3423', 126, 'Új-Zéland', 'Hamilton', 'Clarkin Road', 3214, 2, NULL, NULL),
	(2, '72745678344', 'Katona Márton Barnabás', NULL, 'F10', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2005-07-22', 'Kis Gazsiné', '213 676 33 87 93', 32, 'Afganistan', 'Kabul', 'Asmayi Road', 553, 8, 3, NULL),
	(3, '72345456668', 'Bencsik Gergely', NULL, 'F3', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2004-02-28', 'Tóth András', '36 90 343 5454', 535, 'Uganda', 'Kampala', 'Kabalega Close', NULL, 16, NULL, NULL),
	(4, '74583725375', 'Bende Ákos György', NULL, 'L1', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2005-08-15', 'Kalapos József', '43 673 527890180', 264, 'Austria', 'Graz', 'Plüddemanngasse', 8010, 62, 32, 3);
/*!40000 ALTER TABLE `student` ENABLE KEYS */;

-- Struktúra mentése tábla kollegium. teacher
CREATE TABLE IF NOT EXISTS `teacher` (
  `ID` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `Name` text DEFAULT NULL,
  `OM` varchar(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tábla adatainak mentése kollegium.teacher: ~0 rows (hozzávetőleg)
/*!40000 ALTER TABLE `teacher` DISABLE KEYS */;
/*!40000 ALTER TABLE `teacher` ENABLE KEYS */;

-- Struktúra mentése tábla kollegium. user
CREATE TABLE IF NOT EXISTS `user` (
  `GID` int(20) unsigned NOT NULL AUTO_INCREMENT,
  `ID` int(15) unsigned DEFAULT NULL,
  `Role` tinyint(1) unsigned DEFAULT 0,
  PRIMARY KEY (`GID`),
  KEY `ID` (`ID`,`Role`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tábla adatainak mentése kollegium.user: ~0 rows (hozzávetőleg)
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` (`GID`, `ID`, `Role`) VALUES
	(1, 1, 0),
	(2, 2, 0),
	(3, 3, 0),
	(4, 4, 0);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
