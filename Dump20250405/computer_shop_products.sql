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
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `stock` int NOT NULL,
  `category_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (40,'Apple MacBook Air','Lightweight and powerful laptop with M1 chip',999.99,20,1),(41,'Dell Inspiron 15','Budget-friendly laptop for everyday use',649.99,50,1),(42,'HP Spectre x360','Premium 2-in-1 convertible laptop',1299.99,15,1),(43,'Lenovo Yoga 7i','Stylish convertible laptop with excellent performance',899.99,25,1),(44,'Asus VivoBook 15','Reliable laptop for home and office use',749.99,40,1),(45,'Acer Swift 3','Compact and lightweight laptop for travelers',699.99,30,1),(46,'MSI Prestige 14','Portable laptop designed for creators',1199.99,10,1),(47,'Dell OptiPlex 3090','Compact and powerful desktop for businesses',749.99,35,2),(48,'HP Envy Desktop','Stylish desktop for home and office',999.99,20,2),(49,'Lenovo ThinkCentre M70','Reliable desktop with expandable storage',849.99,15,2),(50,'Apple iMac 24\"','All-in-one desktop with M1 chip',1299.99,10,2),(51,'Asus ROG Gaming PC','High-performance gaming desktop',1599.99,12,2),(52,'Acer Aspire TC','Affordable desktop for basic tasks',649.99,30,2),(53,'MSI Trident 3','Compact gaming desktop with powerful specs',1399.99,8,2),(54,'Logitech Wireless Mouse','Compact and ergonomic wireless mouse',29.99,100,3),(55,'Razer Gaming Mouse','High-precision gaming mouse with RGB lighting',69.99,50,3),(56,'Corsair Mechanical Keyboard','Gaming keyboard with customizable keys',89.99,40,3),(57,'Logitech Webcam C920','Full HD webcam for video conferencing',99.99,25,3),(58,'Samsung Portable SSD T7','Fast and secure external storage',119.99,30,3),(59,'SanDisk Ultra USB 3.0','High-speed USB drive with 128GB capacity',34.99,80,3),(60,'Intel Core i7 Processor','High-performance CPU for demanding tasks',349.99,20,4),(61,'AMD Ryzen 7 5800X','Powerful processor for gaming and multitasking',399.99,15,4),(62,'NVIDIA GeForce RTX 3060','Graphics card for 1080p gaming and VR',399.99,10,4),(63,'Corsair 16GB DDR4 RAM','High-speed memory for desktops',79.99,30,4),(64,'Samsung 970 EVO SSD','Reliable NVMe SSD for fast storage',149.99,20,4),(65,'Seagate Barracuda 2TB HDD','High-capacity hard drive for data storage',69.99,40,4),(66,'TP-Link Archer AX50','Wi-Fi 6 router with fast speeds',129.99,20,5),(67,'Netgear Nighthawk AX12','Premium router with advanced features',499.99,8,5),(68,'Asus RT-AC86U','Dual-band router for high-speed internet',189.99,15,5),(69,'Google Nest WiFi','Mesh WiFi system for whole-home coverage',299.99,10,5),(70,'Ubiquiti UniFi Access Point','Enterprise-grade wireless access point',99.99,25,5),(71,'D-Link Gigabit Switch','Reliable 8-port network switch',59.99,30,5),(72,'PlayStation 5 Console','Next-gen gaming console by Sony',499.99,15,6),(73,'Xbox Series X','High-performance gaming console by Microsoft',499.99,10,6),(74,'Nintendo Switch OLED Model','Hybrid gaming console with vibrant display',349.99,20,6),(75,'Razer Kraken Headset','Gaming headset with surround sound',79.99,30,6),(76,'Logitech G29 Racing Wheel','Steering wheel for realistic racing games',299.99,10,6),(77,'SteelSeries Arctis 7','Wireless gaming headset with clear audio',149.99,25,6),(78,'Elgato Stream Deck','Customizable control panel for streamers',149.99,12,6),(79,'msi gf53','good',599.00,100,7),(80,'azuszenbook','gegfsg',599.04,98,8),(81,'azus zenbook','sadasdsad',599.00,100,7),(82,'razer chroma blackwidow','fsfsdfsf',599.00,100,4),(83,'razer chroma blackwidow','fsfsdfsf',599.00,100,4),(84,'razer chroma blackwidow','sadasdsad',599.00,100,4);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
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
