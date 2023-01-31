/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `kollegium` /*!40100 DEFAULT CHARACTER SET utf8mb3 */;
USE `kollegium`;

CREATE TABLE IF NOT EXISTS `user` (
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS `login_data` (
  `ID` varchar(12) NOT NULL,
  `Username` text DEFAULT NULL,
  `Password` text DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS `auth` (
  `ID` varchar(12) DEFAULT NULL,
  `access_token` varchar(32) DEFAULT NULL,
  `refresh_token` varchar(32) DEFAULT NULL,
  `expires` int(10) unsigned DEFAULT NULL,
  `issued` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expired` bit(1) NOT NULL DEFAULT b'0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

/*!40000 ALTER TABLE `login_data` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_data` ENABLE KEYS */;

CREATE TABLE IF NOT EXISTS `peroutgoing` (
  `ID` varchar(12) NOT NULL,
  `TID` varchar(12) DEFAULT NULL,
  `Day` tinyint(4) DEFAULT NULL,
  `StartTime` time DEFAULT NULL,
  `EndTime` time DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `StartTime` (`StartTime`),
  KEY `Day` (`Day`),
  KEY `EndTime` (`EndTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `peroutgoing` DISABLE KEYS */;
/*!40000 ALTER TABLE `peroutgoing` ENABLE KEYS */;

CREATE TABLE IF NOT EXISTS `roomorder` (
  `RoomNumber` smallint(6) DEFAULT NULL,
  `Floor` tinyint(4) DEFAULT NULL,
  `Windows` binary(2) DEFAULT NULL,
  `Beds` tinyint(4) DEFAULT NULL,
  `Depower` binary(2) DEFAULT NULL,
  `Table` tinyint(4) DEFAULT NULL,
  `Fridge` tinyint(4) DEFAULT NULL,
  `Trash` binary(2) DEFAULT NULL,
  `Air` tinyint(4) DEFAULT NULL,
  `Shelves` tinyint(4) DEFAULT NULL,
  `Tidiness` tinyint(4) DEFAULT NULL,
  `Unwashed` binary(2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `roomorder` DISABLE KEYS */;
/*!40000 ALTER TABLE `roomorder` ENABLE KEYS */;

CREATE TABLE IF NOT EXISTS `student` (
  `ID` varchar(12) NOT NULL,
  `Name` text DEFAULT NULL,
  `Picture` longblob DEFAULT NULL,
  `Group` tinytext DEFAULT NULL,
  `Class` tinytext DEFAULT NULL,
  `School` text DEFAULT NULL,
  `Birthplace` text DEFAULT NULL,
  `Birthdate` date DEFAULT NULL,
  `GuardiaName` text DEFAULT NULL,
  `GuardianPhone` int(11) DEFAULT NULL,
  `Address` text DEFAULT NULL,
  `RoomNumber` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT IGNORE INTO `student` (`ID`, `Name`, `Picture`, `Group`, `Class`, `School`, `Birthplace`, `Birthdate`, `GuardiaName`, `GuardianPhone`, `Address`, `RoomNumber`) VALUES
	("s0", 'Én', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT IGNORE INTO `student` (`ID`, `Name`, `Picture`, `Group`, `Class`, `School`, `Birthplace`, `Birthdate`, `GuardiaName`, `GuardianPhone`, `Address`, `RoomNumber`) VALUES
	("s1", 'Marci', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT IGNORE INTO `student` (`ID`, `Name`, `Picture`, `Group`, `Class`, `School`, `Birthplace`, `Birthdate`, `GuardiaName`, `GuardianPhone`, `Address`, `RoomNumber`) VALUES
	("s2", 'Gyuri', _binary '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
/*!40000 ALTER TABLE `student` ENABLE KEYS */;

CREATE TABLE IF NOT EXISTS `teacher` (
  `ID` varchar(12) NOT NULL,
  `Name` text DEFAULT NULL,
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `teacher` DISABLE KEYS */;
/*!40000 ALTER TABLE `teacher` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
