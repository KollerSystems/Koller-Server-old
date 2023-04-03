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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tábla adatainak mentése kollegium.student: ~4 rows (hozzávetőleg)
/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT INTO `student` (`ID`, `OM`, `Name`, `Picture`, `Group`, `Class`, `School`, `Birthplace`, `Birthdate`, `GuardianName`, `GuardianPhone`, `RoomNumber`, `Country`, `City`, `Street`, `PostCode`, `Address`, `Floor`, `Door`) VALUES
	(1, '73454685362', 'Várnagy Miklós Tamás', NULL, 'F8', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2023-02-26', 'Papp Lajos', '36 64 865 3423', 126, 'Új-Zéland', 'Hamilton', 'Clarkin Road', 3214, 2, NULL, NULL),
	(2, '72745678344', 'Katona Márton Barnabás', NULL, 'F10', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2005-07-22', 'Kis Gazsiné', '213 676 33 87 93', 32, 'Afganistan', 'Kabul', 'Asmayi Road', 553, 8, 3, NULL),
	(3, '74583725375', 'Bende Ákos György', NULL, 'F1', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2005-08-15', 'Kalapos József', '43 673 527890180', 264, 'Austria', 'Graz', 'Plüddemanngasse', 8010, 62, 32, 3),
	(4, '72345456668', 'Bencsik Gergő', NULL, 'F3', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2004-02-28', 'Tóth András', '36 90 343 5454', 535, 'Uganda', 'Kampala', 'Kabalega Close', NULL, 16, NULL, NULL);
  (5, '76793258437', 'Arlana Bielfelt', NULL, 'L1', '13.E', 'Yozio', 'Shinkafe', '2022-07-29', 'Hermy Ruck', '+234 929 113 6165', 860, 'Nigeria', 'Santa Luċija', 'Heath', 4977, 80, NULL, NULL),
  (6, '72532100043', 'Lucita Sleep', NULL, 'L2', '13.B', 'Skinder', 'Stockholm', '2021-12-22', 'Sophronia Rupp', '+46 433 413 2686', 50, 'Sweden', 'Embarcación', 'Bellgrove', 2466, 37, NULL, NULL),
  (7, '70283679305', 'Carena Geffinger', NULL, 'F8', '12.E', 'Midel', 'Semang', '2020-11-26', 'Christopher Uglow', '+62 828 167 3859', 422, 'Indonesia', 'Liuhou', 'Heath', 6606, 100, NULL, NULL),
  (8, '79419859865', 'Gates Poutress', NULL, 'L2', '12.E', 'Quatz', 'Pires do Rio', '2020-04-23', 'Isidora Godar', '+55 952 334 1493', 447, 'Brazil', 'Pombal', 'Veith', 7961, 75, NULL, NULL),
  (9, '77990045269', 'Dominique Tugwell', NULL, 'F7', '11.E', 'Leenti', 'Maloma', '2020-09-06', 'Gaven Pershouse', '+63 876 825 1841', 196, 'Philippines', 'Cannes', 'Brown', 2078, 72, NULL, NULL),
  (10, '71483931425', 'Lorens McGriffin', NULL, 'L3', '13.A', 'Mydeo', 'Hostavice', '2022-02-12', 'Eleanora Gerckens', '+420 848 365 7273', 151, 'Czech Republic', 'Daliuhao', 'Michigan', 3173, 17, NULL, NULL),
  (11, '75657052489', 'Jasper Barton', NULL, 'L8', '12.E', 'Dazzlesphere', 'Sarov', '2020-09-02', 'Mechelle Ambrose', '+7 245 745 4390', 760, 'Russia', 'Lubei', 'Claremont', 3575, 96, NULL, NULL),
  (12, '77511381603', 'Loni Cessford', NULL, 'F0', '13.E', 'Oba', 'Křižanov', '2021-02-23', 'Carly Kitchenman', '+420 741 617 6021', 531, 'Czech Republic', 'Vallenar', 'Clyde Gallagher', 8402, 11, NULL, NULL),
  (13, '70115003807', 'Estevan Gianinotti', NULL, 'F3', '12.A', 'Miboo', 'Rashaant', '2022-01-24', 'Theda Hammerich', '+976 473 620 2113', 142, 'Mongolia', 'Embi', 'Florence', 8576, 67, NULL, NULL),
  (14, '78648111652', 'Basile Dobrowski', NULL, 'F7', '11.B', 'Pixoboo', 'Dingjiaqiao', '2021-04-10', 'Ezequiel Burndred', '+86 102 383 2673', 68, 'China', 'Leopoldina', 'Debra', 7980, 15, NULL, NULL),
  (15, '78588173447', 'Iris Spragge', NULL, 'F1', '13.E', 'Voolia', 'Frederiksberg', '2022-05-06', 'Christopher Coche', '+45 985 835 4542', 77, 'Denmark', 'Zhanxu', 'International', 5534, 1, NULL, NULL),
  (16, '71922677594', 'Dare Mc Harg', NULL, 'F9', '12.E', 'Twitternation', 'Bogorejo', '2021-09-18', 'Merrel Lucas', '+62 748 763 4174', 4, 'Indonesia', 'Olenegorsk', 'Atwood', 8158, 23, NULL, NULL),
  (17, '73028702053', 'Tilda Ziems', NULL, 'F0', '10.E', 'Miboo', 'Leleque', '2020-12-28', 'Karolina Stuchbery', '+54 351 374 6789', 924, 'Argentina', 'Katsina-Ala', 'Green', 9582, 11, NULL, NULL),
  (18, '77538797829', 'Lorenzo Routham', NULL, 'L5', '11.A', 'Oyondu', 'Spirovo', '2021-07-06', 'Nikolos Carrol', '+7 249 995 2596', 604, 'Russia', 'Sawahan', 'Eliot', 1670, 14, NULL, NULL),
  (19, '74138528902', 'Torrin Maccari', NULL, 'F7', '13.E', 'Photojam', 'Beidaihehaibin', '2021-11-14', 'Elysee Sparling', '+86 789 101 4795', 471, 'China', 'Thị Trấn Thuận Châu', 'Marcy', 8910, 55, NULL, NULL),
  (20, '71380325553', 'Jeromy Trank', NULL, 'F3', '13.E', 'Voonte', 'Begang', '2022-08-06', 'Pammie Warbey', '+63 148 903 3467', 151, 'Philippines', 'Skellefteå', 'Westerfield', 7949, 24, NULL, NULL),
  (21, '71128964798', 'Berton Burdon', NULL, 'L1', '13.B', 'Feednation', 'Parral', '2022-08-25', 'Alvera Tabourier', '+56 721 949 7650', 344, 'Chile', 'Bor Tungge', 'Anderson', 9319, 12, NULL, NULL),
  (22, '77144288500', 'Kary Malthus', NULL, 'L7', '13.B', 'Blognation', 'Sindangkopo', '2020-04-09', 'Fanechka Moat', '+62 255 393 1086', 283, 'Indonesia', 'Puerto Obaldía', 'Randy', 5030, 35, NULL, NULL),
  (23, '72400829823', 'Laureen Kaygill', NULL, 'F0', '13.A', 'Leenti', 'Aiquile', '2023-03-19', 'Kalila Hillburn', '+591 777 969 7724', 868, 'Bolivia', 'Ust’-Dzheguta', 'Maple Wood', 804, 88, NULL, NULL),
  (24, '71364487230', 'Anthea Baudouin', NULL, 'L1', '13.B', 'Yabox', 'Newtown', '2022-05-27', 'Bo Ruter', '+44 157 470 9972', 898, 'United Kingdom', 'Funabashi', 'Lillian', 2721, 35, NULL, NULL),
  (25, '73949321972', 'Lyndy Mattisson', NULL, 'L5', '9.E', 'Twitterbeat', 'Rasony', '2020-09-18', 'Corbin De Bruin', '+375 865 656 2799', 822, 'Belarus', 'Santo Domingo', 'Anhalt', 9165, 30, NULL, NULL),
  (26, '74062198728', 'Denney Poyser', NULL, 'L9', '13.B', 'Skinte', 'Stockholm', '2019-11-24', 'Alida Pridmore', '+46 543 145 5404', 234, 'Sweden', 'Hidalgo', 'Thierer', 9067, 63, NULL, NULL),
  (27, '77069612755', 'Roxanne Kahane', NULL, 'L0', '13.E', 'Browsecat', 'Yanjiao', '2020-06-15', 'Daniele Sonier', '+86 216 828 8415', 417, 'China', 'Vĩnh Tường', 'Moland', 4830, 20, NULL, NULL),
  (28, '73843650856', 'Michal Webley', NULL, 'F6', '13.E', 'Brainverse', 'Stoczek', '2022-07-12', 'Lawton Sharer', '+48 435 447 1943', 426, 'Poland', 'San Andres', 'Aberg', 4895, 45, NULL, NULL),
  (29, '78543388527', 'Teressa Darleston', NULL, 'L3', '13.A', 'Pixonyx', 'Krujë', '2023-01-23', 'Torin Basek', '+355 221 832 9397', 918, 'Albania', 'Stenungsund', 'Esker', 7488, 94, NULL, NULL),
  (30, '76776992329', 'Fax Henner', NULL, 'F9', '11.B', 'Voolia', 'Bytkiv', '2021-11-09', 'Byram Rubinsaft', '+380 734 130 4761', 908, 'Ukraine', 'Onguday', 'Dayton', 193, 86, NULL, NULL),
  (31, '77554522942', 'Bertine Gounod', NULL, 'L9', '13.E', 'Npath', 'Arevashogh', '2020-08-26', 'Giffie Brambill', '+374 438 322 3752', 356, 'Armenia', 'Horta', 'Upham', 850, 46, NULL, NULL),
  (32, '76754152997', 'Jordana Casarino', NULL, 'F1', '9.A', 'Eidel', 'Lenger', '2021-12-14', 'Janenna Plampeyn', '+7 585 472 2689', 188, 'Kazakhstan', 'Fakel', 'Bartillon', 1526, 46, NULL, NULL),
  (33, '75096980517', 'Loleta McElvine', NULL, 'F7', '12.A', 'Innojam', 'Flora', '2020-12-20', 'Bobbee Leighfield', '+63 691 844 0550', 234, 'Philippines', 'Batuna Satu', 'Becker', 9935, 80, NULL, NULL),
  (34, '77752069624', 'Frayda Lesurf', NULL, 'F3', '11.A', 'Meezzy', 'Nizhnyaya Maktama', '2022-02-26', 'Jeffrey Thurgood', '+7 443 147 6333', 492, 'Russia', 'Yuxi', 'Lakeland', 685, 82, NULL, NULL),
  (35, '76574180846', 'Heidi Deary', NULL, 'F2', '13.B', 'Thoughtbridge', 'Río Limpio', '2021-04-12', 'Raychel O''Heaney', '+1 228 156 2952', 49, 'Dominican Republic', 'Thị Trấn Pác Miầu', 'North', 226, 79, NULL, NULL),
  (36, '78177142732', 'Donnamarie Lillico', NULL, 'F6', '12.E', 'Agivu', 'Al ‘Āliyah', '2021-06-20', 'Skipton Stanyland', '+216 591 393 0397', 178, 'Tunisia', 'Qabqir', 'Elka', 1997, 87, NULL, NULL),
  (37, '72317100745', 'Dame Birt', NULL, 'F7', '13.E', 'Voonix', 'Nazareth', '2020-01-08', 'Jack Allenson', '+972 435 526 0929', 688, 'Israel', 'Cimuncang', 'Hanover', 4476, 19, NULL, NULL),
  (38, '71923018419', 'Gardie Slatter', NULL, 'L8', '13.B', 'Yata', 'Tungi', '2022-04-23', 'Trina Woodrow', '+880 525 686 5186', 650, 'Bangladesh', 'Tipaz', 'Portage', 5330, 87, NULL, NULL),
  (39, '79017541234', 'Brantley Moon', NULL, 'L6', '12.A', 'Quatz', 'Conceição do Jacuípe', '2022-03-09', 'Laverna Phalp', '+55 863 715 7119', 982, 'Brazil', 'Sendang', 'Bayside', 9065, 79, NULL, NULL),
  (40, '77696868790', 'Emmie Paggitt', NULL, 'L8', '13.A', 'Buzzster', 'Zhoushizhuang', '2022-04-15', 'Sebastian Jeroch', '+86 138 919 9421', 292, 'China', 'Selorejo', 'Hayes', 9167, 76, NULL, NULL),
  (41, '76049971950', 'Jillian Goudy', NULL, 'L2', '13.B', 'Fatz', 'Mianay', '2020-07-03', 'Jennee Praten', '+63 494 712 4158', 794, 'Philippines', 'Patapan', 'Swallow', 1592, 8, NULL, NULL),
  (42, '70787211764', 'Lewiss Harrinson', NULL, 'L8', '9.E', 'Mudo', 'Lívingston', '2020-11-15', 'Maxim Nicolls', '+502 842 111 7493', 777, 'Guatemala', 'Polunochnoye', 'Fisk', 589, 1, NULL, NULL),
  (43, '70401059186', 'Theodor Charkham', NULL, 'F1', '13.B', 'Skajo', 'Klimontów', '2022-10-20', 'Gonzales Paunsford', '+48 994 341 8979', 819, 'Poland', 'São Joaquim da Barra', 'La Follette', 5349, 40, NULL, NULL),
  (44, '79616691763', 'Leeland Dionisetti', NULL, 'L9', '13.E', 'Pixope', 'Arnhem', '2021-08-24', 'Sean Grimster', '+31 440 256 0084', 155, 'Netherlands', 'Ariguaní', 'Erie', 5570, 91, NULL, NULL),
  (45, '76633292308', 'Liz Alldread', NULL, 'L9', '13.E', 'Tambee', 'Kotel’va', '2020-04-06', 'Andy Cossar', '+380 624 573 1210', 213, 'Ukraine', 'Mazongling', 'Gale', 9698, 94, NULL, NULL),
  (46, '77977405604', 'Reiko Habard', NULL, 'F2', '13.E', 'Realfire', 'Santa Cruz', '2021-01-03', 'Talya O''Halloran', '+351 228 507 3088', 126, 'Portugal', 'Szczecinek', 'Barby', 2085, 13, NULL, NULL),
  (47, '71851388761', 'Ahmad Este', NULL, 'L7', '10.B', 'Innojam', 'Krzeczów', '2020-03-16', 'Christean Burborough', '+48 313 483 8845', 131, 'Poland', 'Hwasun', 'Oxford', 8608, 74, NULL, NULL),
  (48, '77596466123', 'Spense Lensch', NULL, 'L0', '12.B', 'Gigazoom', 'Borås', '2020-11-13', 'Barbabra Nanninini', '+46 575 818 1831', 50, 'Sweden', 'Fuxing', '6th', 7356, 24, NULL, NULL),
  (49, '78540593789', 'Thane MacGrath', NULL, 'L9', '13.A', 'Avamm', 'Lluka e Eperme', '2021-06-19', 'Jolie Smelley', '+383 618 261 8346', 942, 'Kosovo', 'Rokytnice', 'Kinsman', 3682, 83, NULL, NULL),
  (50, '74266141342', 'Cody Worvell', NULL, 'L0', '12.A', 'Kwilith', 'Altkirch', '2020-06-11', 'Annnora Robertelli', '+33 160 938 4087', 595, 'France', 'Cluny', 'Welch', 8726, 13, NULL, NULL),
  (51, '71861380563', 'Hermie Cranmore', NULL, 'F2', '13.A', 'Mudo', 'Guamo', '2020-01-10', 'Noreen Gorey', '+57 612 538 1060', 809, 'Colombia', 'Tilik', 'Village Green', 7470, 98, NULL, NULL),
  (52, '77598592050', 'Deny Massingham', NULL, 'F8', '9.E', 'Lazz', 'Shangjia', '2021-02-01', 'Karalynn Shingfield', '+86 934 797 4829', 696, 'China', 'Vischongo', 'Oakridge', 3551, 32, NULL, NULL),
  (53, '73357106095', 'Willi Broseman', NULL, 'L3', '10.A', 'Rhynoodle', 'Huanoquite', '2022-07-26', 'Sheilakathryn Nicholls', '+51 286 397 9049', 271, 'Peru', 'Crespo', 'Oak Valley', 6626, 58, NULL, NULL),
  (54, '70146402583', 'Town Baake', NULL, 'F3', '13.B', 'Divanoodle', 'Jiuxian', '2020-12-27', 'Berry Congreve', '+86 558 186 2179', 529, 'China', 'Ciguna', 'Clarendon', 4190, 60, NULL, NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `role_name` (
  `Role` tinyint(1) unsigned DEFAULT 0,
  `Table` varchar(64) NOT NULL,
  `FullName` text DEFAULT NULL,
  PRIMARY KEY (`Role`),
  KEY (`Table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS `permissions` (
  `Table` varchar(64) NOT NULL,
  `Field` varchar(64) NOT NULL,
  `studentRead` bit(1) NOT NULL DEFAULT b'0',
  `teacherRead` bit(1) NOT NULL DEFAULT b'0',
  KEY (`Table`, `Field`)
);

INSERT INTO `permissions` VALUES ('student', 'ID', b'1', b'1');
INSERT INTO `permissions` VALUES ('student', 'Name', b'1', b'1');
INSERT INTO `permissions` VALUES ('student', 'Picture', b'1', b'1');
INSERT INTO `permissions` VALUES ('student', 'Group', b'1', b'1');
INSERT INTO `permissions` VALUES ('student', 'Class', b'1', b'1');
INSERT INTO `permissions` VALUES ('student', 'School', b'1', b'1');
INSERT INTO `permissions` VALUES ('student', 'RoomNumber', b'1', b'1');

INSERT INTO `permissions` VALUES ('student', 'Birthdate', b'0', b'1');
INSERT INTO `permissions` VALUES ('student', 'GuardianName', b'0', b'1');
INSERT INTO `permissions` VALUES ('student', 'GuardianPhone', b'0', b'1');
INSERT INTO `permissions` VALUES ('student', 'Country', b'0', b'1');
INSERT INTO `permissions` VALUES ('student', 'City', b'0', b'1');

INSERT INTO `permissions` VALUES ('teacher', 'ID', b'1', b'1');
INSERT INTO `permissions` VALUES ('teacher', 'Name', b'1', b'1');

INSERT INTO `role_name` (`Role`, `Table`, `FullName`) VALUES
  (1, 'student', 'kollégiumi diák');
INSERT INTO `role_name` (`Role`, `Table`, `FullName`) VALUES
  (2, 'teacher', 'nevelőtanár');

-- Tábla adatainak mentése kollegium.user: ~0 rows (hozzávetőleg)
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` (`GID`, `ID`, `Role`) VALUES
	(1, 1, 1),
	(2, 2, 1),
	(3, 3, 1),
	(4, 4, 1);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
