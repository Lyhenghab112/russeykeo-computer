-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: computer_shop
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `address` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'John','Doe','john.doe@example.com','1234567890','123 Main St, New York, NY 10001'),(2,'Jane','Smith','jane.smith@example.com','0987654321','456 Elm St, Los Angeles, CA 90001'),(3,'Michael','Brown','michael.brown@example.com','4561237890','789 Oak St, Chicago, IL 60007'),(4,'Emily','Davis','emily.davis@example.com','3216549870','159 Pine St, Houston, TX 77001'),(5,'Robert','Johnson','robert.johnson@example.com','9876543210','753 Maple St, Phoenix, AZ 85001'),(6,'Linda','Wilson','linda.wilson@example.com','6549871230','951 Birch St, Philadelphia, PA 19019'),(7,'William','Lee','william.lee@example.com','8523697410','456 Spruce St, San Antonio, TX 78201'),(8,'Elizabeth','Taylor','elizabeth.taylor@example.com','7891234560','369 Cedar St, San Diego, CA 92101'),(9,'James','White','james.white@example.com','7412589630','147 Walnut St, Dallas, TX 75201'),(10,'Patricia','Harris','patricia.harris@example.com','9638527410','258 Willow St, Austin, TX 73301'),(11,'Mark','Hall','mark.hall@example.com','6987452310','123 Aspen Dr, Seattle, WA 98101'),(12,'Susan','Clark','susan.clark@example.com','1236985470','456 Oak Ln, Boston, MA 02101'),(13,'Thomas','Lewis','thomas.lewis@example.com','8796541230','789 Pine Rd, Denver, CO 80201'),(14,'Mary','Martinez','mary.martinez@example.com','5698741230','951 Cedar Blvd, Miami, FL 33101'),(15,'David','Moore','david.moore@example.com','3698527410','753 Walnut Ave, Atlanta, GA 30301'),(16,'Jennifer','Anderson','jennifer.anderson@example.com','9871236540','159 Birch Ct, Minneapolis, MN 55401'),(17,'Charles','King','charles.king@example.com','8527419630','147 Willow St, Portland, OR 97201'),(18,'Sarah','Young','sarah.young@example.com','2589631470','258 Elm Dr, Orlando, FL 32801'),(19,'Steven','Wright','steven.wright@example.com','7894561230','369 Maple Ct, Sacramento, CA 94203'),(20,'Barbara','Scott','barbara.scott@example.com','6541237890','951 Pine Ln, Las Vegas, NV 89101'),(21,'Andrew','Harris','andrew.harris@example.com','8529637410','753 Birch Blvd, Tampa, FL 33601'),(22,'Angela','Brown','angela.brown@example.com','7413698520','456 Cedar Rd, Columbus, OH 43201'),(23,'Paul','Walker','paul.walker@example.com','3691478520','369 Walnut Dr, Indianapolis, IN 46201'),(24,'Catherine','Adams','catherine.adams@example.com','7898523690','159 Willow Ct, Charlotte, NC 28201'),(25,'Daniel','Perez','daniel.perez@example.com','8521473690','753 Oak Ln, Milwaukee, WI 53201'),(26,'Laura','Collins','laura.collins@example.com','9632587410','456 Maple Blvd, Kansas City, MO 64101'),(27,'Peter','Evans','peter.evans@example.com','1473692580','123 Cedar Dr, Louisville, KY 40201'),(28,'Rachel','Taylor','rachel.taylor@example.com','3214569870','789 Birch Ct, Baltimore, MD 21201'),(29,'Christopher','Hill','christopher.hill@example.com','9876542580','159 Elm Ln, Memphis, TN 38101'),(30,'Kimberly','Campbell','kimberly.campbell@example.com','8523691470','753 Pine Ave, Omaha, NE 68101'),(31,'Matthew','Howard','matthew.howard@example.com','3698521470','369 Walnut Ct, Nashville, TN 37201'),(32,'Karen','Carter','karen.carter@example.com','7891234567','951 Willow Dr, Phoenix, AZ 85001'),(33,'Jeffrey','Ward','jeffrey.ward@example.com','7418529630','147 Birch Ln, San Francisco, CA 94101'),(34,'Sophia','Reed','sophia.reed@example.com','9631478520','258 Elm St, St. Louis, MO 63101'),(35,'Brian','Parker','brian.parker@example.com','1234569870','951 Maple Rd, Cincinnati, OH 45201'),(36,'Michelle','Cook','michelle.cook@example.com','8523697410','753 Cedar Blvd, New Orleans, LA 70101'),(37,'Timothy','Bell','timothy.bell@example.com','3698521230','369 Pine Ln, Honolulu, HI 96801'),(38,'Laura','Morgan','laura.morgan@example.com','9632587410','159 Willow Ct, Salt Lake City, UT 84101'),(39,'Nathan','Mitchell','nathan.mitchell@example.com','8521479630','147 Oak St, Dallas, TX 75201'),(40,'Amy','Sanchez','amy.sanchez@example.com','7894568520','258 Walnut Blvd, Austin, TX 73301'),(41,'Victoria','Garcia','victoria.garcia@example.com','4561237890','456 Cedar Rd, San Antonio, TX 78201'),(42,'Kevin','Ross','kevin.ross@example.com','3216548520','369 Maple Ct, San Diego, CA 92101'),(43,'Tiffany','Clark','tiffany.clark@example.com','8529631230','753 Elm Ln, Las Vegas, NV 89101'),(44,'Eric','Thompson','eric.thompson@example.com','1473698520','159 Birch St, Miami, FL 33101'),(45,'Stephanie','Lopez','stephanie.lopez@example.com','3214569630','258 Oak Dr, Houston, TX 77001'),(46,'Thomas','Allen','thomas.allen@example.com','9871236547','951 Spruce Ct, Chicago, IL 60007'),(47,'Kelly','Murphy','kelly.murphy@example.com','8523691470','123 Pine Ave, Los Angeles, CA 90001'),(48,'Sean','Foster','sean.foster@example.com','9638527410','753 Cedar Blvd, New York, NY 10001'),(49,'Megan','Long','megan.long@example.com','3697418520','456 Maple Rd, Seattle, WA 98101');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-04-05  9:56:20
