-- Tábla adatainak mentése kollegium.login_data: ~0 rows (hozzávetőleg)
/*!40000 ALTER TABLE `login_data` DISABLE KEYS */;
INSERT INTO `login_data` (`GID`, `Username`, `Password`) VALUES
	(1, 'Miki', 'almafa1234'),
	(2, 'Barnabás', 'almafa1234'),
	(3, 'Gyuri', 'almafa1234'),
	(4, 'Gergő', 'almafa1234'),
  (5, 'DJ', 'almafa1234');


INSERT INTO `teacher` VALUES (1, 'Dobos József', '72237485955');

-- Tábla adatainak mentése kollegium.student: ~4 rows (hozzávetőleg)
/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT INTO `student` (`ID`, `OM`, `Name`, `Picture`, `Group`, `Class`, `School`, `Birthplace`, `Birthdate`, `GuardianName`, `GuardianPhone`, `RoomNumber`, `Country`, `City`, `Street`, `PostCode`, `Address`, `Floor`, `Door`) VALUES
	(1, '73454685362', 'Várnagy Miklós Tamás', NULL, 'F8', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2023-02-26', 'Papp Lajos', '36 64 865 3423', 126, 'Új-Zéland', 'Hamilton', 'Clarkin Road', 3214, 2, NULL, NULL),
	(2, '72745678344', 'Katona Márton Barnabás', NULL, 'F10', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2005-07-22', 'Kis Gazsiné', '213 676 33 87 93', 32, 'Afganistan', 'Kabul', 'Asmayi Road', 553, 8, 3, NULL),
	(3, '74583725375', 'Bende Ákos György', NULL, 'F1', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2005-08-15', 'Kalapos József', '43 673 527890180', 264, 'Austria', 'Graz', 'Plüddemanngasse', 8010, 62, 32, 3),
	(4, '72345456668', 'Bencsik Gergő', NULL, 'F3', '11.B', 'BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', '2004-02-28', 'Tóth András', '36 90 343 5454', 535, 'Uganda', 'Kampala', 'Kabalega Close', NULL, 16, NULL, NULL);
/*!40000 ALTER TABLE `student` ENABLE KEYS */;


INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'ID', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'Name', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'Picture', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'Group', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'Class', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'School', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'RoomNumber', b'1');

INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'Birthdate', b'0');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'GuardianName', b'0');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'GuardianPhone', b'0');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'Country', b'0');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'student', 'City', b'0');

INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'teacher', 'ID', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'teacher', 'Name', b'1');

INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'mifare_tags', 'PID', b'0');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'mifare_tags', 'Issued', b'0');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (1, 'mifare_tags', 'Bytes', b'0');


INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'ID', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'Name', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'Picture', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'Group', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'Class', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'School', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'RoomNumber', b'1');

INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'Birthdate', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'GuardianName', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'GuardianPhone', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'Country', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'student', 'City', b'1');

INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'teacher', 'ID', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'teacher', 'Name', b'1');

INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'mifare_tags', 'PID', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'mifare_tags', 'Issued', b'1');
INSERT INTO `permissions` (`Role`, `Table`, `Field`, `Read`) VALUES (2, 'mifare_tags', 'Bytes', b'1');


INSERT INTO `route_access` VALUES (1, '/api/crossings/events', b'0', b'1');
INSERT INTO `route_access` VALUES (2, '/api/crossings/events', b'1', b'0');
INSERT INTO `route_access` VALUES (1, '/api/crossings/me', b'1', b'0');
INSERT INTO `route_access` VALUES (2, '/api/crossings/me', b'1', b'0');
INSERT INTO `route_access` VALUES (1, '/api/crossings/:id', b'0', b'1');
INSERT INTO `route_access` VALUES (2, '/api/crossings/:id', b'1', b'0');

INSERT INTO `route_access` VALUES (1, '/api/users', b'1', b'0');
INSERT INTO `route_access` VALUES (2, '/api/users', b'1', b'0');
INSERT INTO `route_access` VALUES (1, '/api/users/me', b'1', b'0');
INSERT INTO `route_access` VALUES (2, '/api/users/me', b'1', b'0');
INSERT INTO `route_access` VALUES (1, '/api/users/:id', b'1', b'0');
INSERT INTO `route_access` VALUES (2, '/api/users/:id', b'1', b'0');
INSERT INTO `route_access` VALUES (1, '/api/users/mifare', b'0', b'0');
INSERT INTO `route_access` VALUES (2, '/api/users/mifare', b'1', b'0');


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
	(4, 4, 1),
  (5, 1, 2);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;

INSERT INTO `mifare_tags` (PID, Bytes) VALUES (1, x'b69f6669d72c5ce0f0c4bac027cd961c9c9ad06fdaf5e93244297a64fc555a7a');