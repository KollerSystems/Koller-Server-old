/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `kollegium` /*!40100 DEFAULT CHARACTER SET utf8mb3 */;
USE `kollegium`;

CREATE TABLE IF NOT EXISTS `crossings` (
  `ID` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `SID` int(15) unsigned DEFAULT NULL,
  `Time` datetime DEFAULT NULL,
  `Direction` binary(2) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `crossings` DISABLE KEYS */;
/*!40000 ALTER TABLE `crossings` ENABLE KEYS */;

CREATE TABLE IF NOT EXISTS `login_data` (
  `GID` int(20) unsigned NOT NULL,
  `Username` text DEFAULT NULL,
  `Password` text DEFAULT NULL,
  PRIMARY KEY (`GID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `login_data` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_data` ENABLE KEYS */;

CREATE TABLE IF NOT EXISTS `auth` (
  `ID` varchar(12) DEFAULT NULL,
  `access_token` varchar(32) DEFAULT NULL,
  `refresh_token` varchar(32) DEFAULT NULL,
  `expires` int(10) unsigned DEFAULT NULL,
  `issued` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expired` bit(1) NOT NULL DEFAULT b'0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;


CREATE TABLE IF NOT EXISTS `peroutgoing` (
  `SID` int(10) unsigned NOT NULL DEFAULT 0,
  `TID` int(10) unsigned DEFAULT NULL,
  `Day` tinyint(4) DEFAULT NULL,
  `StartTime` time DEFAULT NULL,
  `EndTime` time DEFAULT NULL,
  KEY `Index 1` (`SID`,`StartTime`,`EndTime`,`Day`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `peroutgoing` DISABLE KEYS */;
/*!40000 ALTER TABLE `peroutgoing` ENABLE KEYS */;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `roomorder` DISABLE KEYS */;
/*!40000 ALTER TABLE `roomorder` ENABLE KEYS */;

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
  `GuardiaName` text DEFAULT NULL,
  `GuardianPhone` int(11) DEFAULT NULL,
  `Address` text DEFAULT NULL,
  `RoomNumber` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `student` DISABLE KEYS */;
/*!40000 ALTER TABLE `student` ENABLE KEYS */;

CREATE TABLE IF NOT EXISTS `teacher` (
  `ID` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `Name` text DEFAULT NULL,
  `OM` varchar(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `teacher` DISABLE KEYS */;
/*!40000 ALTER TABLE `teacher` ENABLE KEYS */;

CREATE TABLE IF NOT EXISTS `user` (
  `GID` int(20) unsigned NOT NULL AUTO_INCREMENT,
  `ID` int(15) unsigned DEFAULT NULL,
  `Role` tinyint(1) unsigned DEFAULT 0,
  PRIMARY KEY (`GID`),
  KEY `ID` (`ID`,`Role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

/*!40000 ALTER TABLE `user` DISABLE KEYS */;
/*!40000 ALTER TABLE `user` ENABLE KEYS */;

CREATE TABLE IF NOT EXISTS `role_name` (
  `Role` tinyint(1) unsigned DEFAULT 0,
  `Table` varchar(64) NOT NULL,
  `FullName` text DEFAULT NULL,
  PRIMARY KEY (`Role`),
  KEY (`Table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `role_name` (`Role`, `Table`, `FullName`) VALUES
  (1, 'student', 'kollégiumi diák');
INSERT INTO `role_name` (`Role`, `Table`, `FullName`) VALUES
  (2, 'teacher', 'nevelőtanár');

/*!40000 ALTER TABLE `role_name` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_name` ENABLE KEYS */;


INSERT INTO `student` (`ID`, `OM`, `Name`, `Picture`, `Group`, `Class`, `School`, `Birthplace`, `Birthdate`, `GuardiaName`, `GuardianPhone`, `Address`, `RoomNumber`) VALUES
	(32, '72136781423', 'Pista', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `user` (`ID`, `Role`) VALUES
  (32,1);
INSERT INTO `login_data` (`GID`, `Username`, `Password`) VALUES
  (1, 'Xx_Pistike_xX', 'GoofyEmber');

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
