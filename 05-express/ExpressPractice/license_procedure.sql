-- MySQL dump 10.13  Distrib 5.5.37, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: license
-- ------------------------------------------------------
-- Server version	5.5.37-0ubuntu0.12.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping routines for database 'license'
--
/*!50003 DROP FUNCTION IF EXISTS `budget_point_device_all_time` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `budget_point_device_all_time`(org_id INT) RETURNS int(11)
BEGIN
DECLARE ret_val INT default 0;
SET ret_val=IFNULL((select SUM(1*
            (SELECT TRUNCATE((select expense from billing_profile_device where device_model_id=
            (select device_model_id from device_uid where id = device_id) and profile_id=
            (select id from billing_profile where billing_profile.id=
            (select profile_id from organization_group where organization_group.id=
            (select group_id from organization where id=org_id)))
            ),4))) from device where organization_id=org_id and unregister_time='0000-00-00 00:00:00'),0);
RETURN ret_val;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `check_org_deducting` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `check_org_deducting`(org_id INT) RETURNS int(4)
BEGIN
DECLARE ret_val INT default 0;
DECLARE org_state VARCHAR(10);
DECLARE zone VARCHAR(10);
DECLARE cycle VARCHAR(10);
DECLARE local_time_temp VARCHAR(32);
DECLARE local_time_check VARCHAR(32);
SELECT organization.state,organization.time_zone,billing_profile.cycle INTO org_state,zone,cycle FROM organization,organization_group,billing_profile WHERE organization.group_id=organization_group.id AND organization_group.profile_id=billing_profile.id AND organization.id=org_id;
SET local_time_temp=get_local_time(now(),zone);
IF(org_state='normal') THEN
IF(cycle='month') THEN
SET local_time_check=get_interval_day(local_time_temp,-dayofmonth(local_time_temp)+1);
END IF;
IF(cycle='week') THEN
SET local_time_check=get_interval_day(local_time_temp,-dayofweek(local_time_temp)+1);
END IF;
IF(cycle='day') THEN
SET local_time_check=get_interval_day(local_time_temp,-1);
END IF;
SET local_time_check=(select date_format(local_time_check,'%Y-%m-%d 00:00:00'));
SET local_time_check=get_local_time_from_zone(local_time_check,zone);
SET ret_val=IFNULL((select id from billing_history where organization_id=org_id and time_stamp between local_time_check and (get_local_time_from_zone(local_time_temp,zone))),-1);
IF(ret_val=-1) THEN
SET ret_val=1;
ELSE
SET ret_val=0;
END IF;
ELSE
SET ret_val=0;
END IF;
RETURN ret_val;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `deduct_point` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `deduct_point`(org_id INT,zone VARCHAR(16),start_time VARCHAR(32),end_time VARCHAR(32),cycle VARCHAR(10)) RETURNS float(15,4)
BEGIN
DECLARE ret_val float default 0;
DECLARE done int default 0;
DECLARE l_device_id VARCHAR(32);
DECLARE my_cursor CURSOR FOR select device_id from device where organization_id=org_id;     
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
Open my_cursor;
booking_loop:loop
FETCH my_cursor into l_device_id; 
if done=1 then
    leave booking_loop;
end if;
set ret_val = (IFNULL(ret_val+deduct_point_device(org_id,l_device_id,zone,start_time,end_time,cycle),0));
end loop booking_loop;
close my_cursor;
RETURN ret_val;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `deduct_point_device` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `deduct_point_device`(org_id INT,deviceid VARCHAR(32),zone VARCHAR(16),start_time VARCHAR(32),end_time VARCHAR(32),cycle VARCHAR(10)) RETURNS float(15,4)
BEGIN
DECLARE ret_val float default 0;
DECLARE device_expense INT default 0;
DECLARE online_days INT default 0;
SET device_expense=(select expense from billing_profile_device where profile_id=(select profile_id from organization_group where organization_group.id=(select group_id from organization where id=org_id)) and device_model_id=(select device_model_id from device_uid where id=deviceid));
SET online_days=(select SUM((datediff((SELECT CASE WHEN unregister_time="0000-00-00 00:00:00" THEN end_time ELSE (get_local_time(unregister_time,zone)) END),(SELECT CASE WHEN (datediff(start_time,(get_local_time(register_time,zone)))>0) THEN start_time ELSE (get_local_time(register_time,zone)) END))+1)) as result from device where device_id=deviceid and organization_id=org_id and (unregister_time='0000-00-00 00:00:00' or datediff(start_time,get_local_time(unregister_time,zone))<=0));
IF(online_days<0) THEN
SET ret_val=0;
ELSE
IF(cycle='week') THEN
SET ret_val=(IFNULL((select round(device_expense*online_days/7,4)),0));
END IF;
IF(cycle='month') THEN
SET ret_val=(IFNULL((select round((device_expense*online_days/(select day(last_day(end_time)))),4)),0));
END IF;
IF(cycle='day') THEN
SET ret_val=(IFNULL(device_expense*online_days,0)); 
END IF;
END IF;
RETURN ret_val;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `get_interval_day` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `get_interval_day`(local_time VARCHAR(32),interval_day INT) RETURNS varchar(32) CHARSET utf8
BEGIN
DECLARE ret_val VARCHAR(32);
SET ret_val=(select date_format(DATE_ADD(local_time,INTERVAL interval_day day),'%Y-%m-%d %H:%i:%s'));
RETURN ret_val;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `get_local_time` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `get_local_time`(local_time VARCHAR(32),zone VARCHAR(16)) RETURNS varchar(32) CHARSET utf8
BEGIN
DECLARE ret_val VARCHAR(32);
SET ret_val=(select date_format(DATE_ADD(local_time,INTERVAL ((left(zone,3)+0)-timestampdiff(hour,utc_timestamp(),now())) hour),'%Y-%m-%d %H:%i:%s'));
RETURN ret_val;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `get_local_time_from_zone` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `get_local_time_from_zone`(local_time VARCHAR(32),zone VARCHAR(16)) RETURNS varchar(32) CHARSET utf8
BEGIN
DECLARE ret_val VARCHAR(32);
SET ret_val=(select date_format(DATE_ADD(local_time,INTERVAL (timestampdiff(hour,utc_timestamp(),now())-(left(zone,3)+0)) hour),'%Y-%m-%d %H:%i:%s'));
RETURN ret_val;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `license_accounts` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `license_accounts`(ret_val INT,org_id INT,IN_license_id VARCHAR(20)) RETURNS int(11)
BEGIN
DECLARE points INT;
DECLARE bill_id INT default 0;
IF(ret_val <= 0) THEN
   RETURN(0);
END IF;
SET bill_id=(select id from billing_history where organization_id=org_id and time_stamp like concat(curdate(),'%'));
SET points=(select remaining_point from license where id=IN_license_id); 
IF(points<=0)  THEN
RETURN(ret_val);
END IF;
IF(ret_val >= points) THEN
SET ret_val=(ret_val-points);
INSERT INTO license_log(organization_id,license_id,billing_id,change_point,action)VALUES(org_id,IN_license_id,bill_id,-points,'deduct');
RETURN(ret_val);
END IF;
IF (ret_val>0 && ret_val<points) THEN
SET points=(points-ret_val);
INSERT INTO license_log(organization_id,license_id,billing_id,change_point,action)VALUES(org_id,IN_license_id,bill_id,-ret_val,'deduct');
SET ret_val=0;
RETURN(ret_val);
END IF;
RETURN(0);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `deduct_license` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `deduct_license`(IN org_id INT,IN org_points INT,IN l_bill_id INT)
BEGIN
DECLARE done int default 0;
DECLARE points INT default 0;
DECLARE ret_val INT default 0;
DECLARE l_license_id VARCHAR(32);
DECLARE my_cursor CURSOR FOR select id from license where organization_id=org_id and remaining_point!=0 order by last_update ASC;     
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
Open my_cursor;
set ret_val=org_points;
REPEAT
FETCH my_cursor into l_license_id; 
SET points=(select remaining_point from license where id=l_license_id);
IF(ret_val >= points) THEN
SET ret_val=(ret_val-points);
INSERT INTO license_log(organization_id,license_id,billing_id,change_point,action)VALUES(org_id,l_license_id,l_bill_id,-points,'deduct');
UPDATE license SET remaining_point=0 WHERE id=l_license_id and organization_id=org_id;
INSERT INTO license_history(id,organization_id,user_id,original_point,remaining_point,po_number,expiration,last_update) select id,organization_id,user_id,original_point,remaining_point,po_number,expiration,last_update from license where id=l_license_id;
delete from license where id=l_license_id;
END IF;
IF (ret_val>0 && ret_val<points) THEN
SET points=(points-ret_val);
INSERT INTO license_log(organization_id,license_id,billing_id,change_point,action)VALUES(org_id,l_license_id,l_bill_id,-ret_val,'deduct');
UPDATE license SET remaining_point=points WHERE id = l_license_id and organization_id=org_id;
SET ret_val=0;
END IF;
UNTIL done=1
END REPEAT;
close my_cursor;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `deduct_org_procedure` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `deduct_org_procedure`()
BEGIN
declare done int default 0;
declare o int;
DECLARE ordernumbers CURSOR FOR select id from organization where state='normal';     
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
Open ordernumbers;
booking_loop:loop
FETCH ordernumbers into o; 
if done=1 then
    leave booking_loop;
end if;
call license_deducting(o,(select time_zone from organization where id=o),1);
end loop booking_loop;
close ordernumbers;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `deduct_procedure` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `deduct_procedure`(IN zone VARCHAR(16))
BEGIN
declare done int default 0;
declare o int;
DECLARE ordernumbers CURSOR FOR select id from organization where time_zone=zone and state='normal';     
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
Open ordernumbers;
booking_loop:loop
FETCH ordernumbers into o; 
if done=1 then
    leave booking_loop;
end if;
call license_deducting(o,zone,0);
end loop booking_loop;
close ordernumbers;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `devices_logs_device` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `devices_logs_device`(IN model_id INT,IN org_id INT,IN date_time VARCHAR(16))
begin
DECLARE done INT DEFAULT 0;
DECLARE num INT DEFAULT 0;
DECLARE num_ago INT DEFAULT 0;
DECLARE device_uid varchar(50) DEFAULT NULL;
DECLARE state_first varchar(50) DEFAULT NULL;
DECLARE time varchar(50) DEFAULT NULL;
DECLARE last_state_date varchar(50) DEFAULT NULL;

DECLARE device_uid_other varchar(50) DEFAULT NULL;
DECLARE state_other varchar(50) DEFAULT NULL;
DECLARE time_other varchar(50) DEFAULT NULL;
DECLARE zone varchar(50) DEFAULT NULL;
DECLARE cur CURSOR FOR select device_id,state,last_update from device_log where date_format((select DATE_ADD(last_update,INTERVAL ((select (left(time_zone,3)+0) from organization where id=org_id)
-timestampdiff(hour,utc_timestamp(),now())) hour)),'%Y%m') = date_time and organization_id=org_id and (select device_model_id from  device_uid  where id=device_id)=model_id order by device_id ASC,last_update ASC,id ASC;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
SET zone = (select time_zone from organization where id=org_id);
SET last_state_date = (select get_local_time(timestamp,zone) from organization_log where DATE_FORMAT(get_local_time(timestamp,zone),'%Y%m%d') = date_time and organization_id = org_id and state = 'normal');
open cur;
REPEAT  
FETCH cur INTO device_uid,state_first,time;
if not done then 
IF(device_uid = device_uid_other && state_first = 'unregister' && state_other = 'register') THEN 
 SET num = (num+(select datediff(get_local_time(time_other,zone),get_local_time(time,zone)))+1);
END IF;
IF (device_uid != device_uid_other && state_other = 'register') THEN 
SET num = num+(select DAYOFMONTH(last_day(CONCAT(date_time,'01')))-DATE_FORMAT(get_local_time(time_other,zone),'%d'))+1;
END IF;
IF (device_uid != device_uid_other && state_other = 'unregister') THEN 
IF (LENGTH(last_state_date) = 19 && TIMESTAMPDIFF(SECOND,last_state_date,get_local_time(time_other,zone))>0) THEN 
SET num = num+(select DATE_FORMAT(get_local_time(time_other,zone),'%d')-DATE_FORMAT(get_local_time(last_state_date,zone),'%d'))+1;
END IF;
IF (LENGTH(last_state_date) = 0) THEN 
SET num = num+(select DATE_FORMAT(get_local_time(time_other,zone),'%d'));
END IF;
END IF;
IF(device_uid = device_uid_other && state_first = 'register' && state_other = 'unregister') THEN
IF(DATE_FORMAT(get_local_time(time_other,zone),'%Y-%m-%d')= DATE_FORMAT(get_local_time(time,zone),'%Y-%m-%d')) THEN
SET num=(num-1);
END IF;
END IF;
SET device_uid_other = device_uid;
SET state_other = state_first;
SET time_other = time; 
end if;
UNTIL done END REPEAT;
CLOSE cur;
IF (device_uid = device_uid_other && state_first = 'register' && state_other = 'register') THEN 
SET num = num+(select DAYOFMONTH(last_day(CONCAT(date_time,'01')))-DATE_FORMAT(get_local_time(time_other,zone),'%d'))+1;
END IF;
IF (device_uid != device_uid_other && state_other = 'unregister') THEN 
IF (ISNULL(last_state_date) = 0 && TIMESTAMPDIFF(SECOND,last_state_date,get_local_time(time_other,zone))>0) THEN 
SET num = num+(select DATE_FORMAT(get_local_time(time_other,zone),'%d')-DATE_FORMAT(get_local_time(last_state_date,zone),'%d'))+1;
END IF;
IF (ISNULL(last_state_date) = 1) THEN 
SET num = num+(select DATE_FORMAT(get_local_time(time_other,zone),'%d'));
END IF;
END IF;
call devices_logs_device_ago(model_id,org_id,zone,date_time,num_ago);
SET num= (num+num_ago);
select num;
end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `devices_logs_device_ago` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `devices_logs_device_ago`(IN model_id INT,IN org_id INT,IN zone VARCHAR(16),IN date_time VARCHAR(16),OUT total_ago INT)
begin
DECLARE done INT DEFAULT 0;
DECLARE num INT DEFAULT 0;
DECLARE count INT DEFAULT 0;
DECLARE device_uid varchar(50) DEFAULT NULL;
DECLARE time varchar(50) DEFAULT NULL;
DECLARE last_state_date varchar(50) DEFAULT NULL;

DECLARE device_state varchar(50) DEFAULT NULL;
DECLARE cur CURSOR FOR SELECT device_id ,MAX(last_update) AS MAXIMUM FROM  device_log  where  ( DATE_FORMAT(get_local_time(last_update,zone),'%Y%m')+0) < (date_time+0) and organization_id=org_id  and (select device_model_id from  device_uid  where id=device_id)=model_id  GROUP BY device_id;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
SET last_state_date = (select get_local_time(timestamp,zone) from organization_log where DATE_FORMAT(get_local_time(timestamp,zone),'%Y%m') = date_time and organization_id = org_id and state = 'normal');
open cur;
REPEAT  
FETCH cur INTO device_uid,time;
if not done then 
SET device_state=(select state from device_log where device_id = device_uid and last_update = time);
SET count = (select count(device_id) from device_log where DATE_FORMAT(get_local_time(last_update,zone),'%Y%m')=date_time and organization_id = org_id and device_id = device_uid);
IF(device_state='register') THEN
IF (ISNULL(last_state_date) = 0 && count=0) THEN 
SET num = num+(select DAYOFMONTH(last_day(CONCAT(date_time,'01')))-DATE_FORMAT(get_local_time(last_state_date,zone),'%d'))+1;
END IF;
IF (ISNULL(last_state_date) = 1 && count=0) THEN 
SET num = num+(select DAYOFMONTH(last_day(CONCAT(date_time,'01'))));
END IF;
END IF;
end if;
UNTIL done END REPEAT;
CLOSE cur;
SET total_ago = num;
end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `devices_logs_device_day` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `devices_logs_device_day`(IN model_id INT,IN org_id INT,IN date_time VARCHAR(16))
begin
DECLARE num INT DEFAULT 0;
DECLARE num_ago INT DEFAULT 0;
DECLARE zone varchar(50) DEFAULT NULL;
DECLARE last_state_date varchar(50) DEFAULT NULL;
SET zone = (select time_zone from organization where id=org_id);
SET last_state_date = (select get_local_time(timestamp,zone) from organization_log where DATE_FORMAT(get_local_time(timestamp,zone),'%Y%m%d') = date_time and organization_id = org_id and state = 'normal');
IF (ISNULL(last_state_date) = 1) THEN 
SET num = (select count(distinct  device_id) from device_log  where 
date_format((select DATE_ADD(last_update,INTERVAL ((select (left(time_zone,3)+0) from  organization where id=org_id)-timestampdiff(hour,utc_timestamp(),now())) hour)),'%Y%m%d') = date_time and organization_id=org_id and (select device_model_id from device_uid where id=device_id)=model_id order by device_id ASC,last_update ASC,id ASC);
ELSE
SET num = (select count(distinct  device_id) from device_log  where TIMESTAMPDIFF(SECOND,last_state_date,get_local_time(last_update,zone))>0 and DATE_FORMAT(get_local_time(last_update,zone),'%Y%m%d')=date_time and organization_id=org_id and (select device_model_id from device_uid where id=device_id)=model_id order by device_id ASC,last_update ASC,id ASC);
END IF;
call devices_logs_device_day_ago(model_id,org_id,zone,date_time,num_ago);
SET num= (num+num_ago);
select num;
end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `devices_logs_device_day_ago` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `devices_logs_device_day_ago`(IN model_id INT,IN org_id INT,IN zone VARCHAR(16),IN date_time VARCHAR(16),OUT total_ago INT)
begin
DECLARE done INT DEFAULT 0;
DECLARE num INT DEFAULT 0;
DECLARE count INT DEFAULT 0;
DECLARE device_uid varchar(50) DEFAULT NULL;
DECLARE time varchar(50) DEFAULT NULL;
DECLARE last_state_date varchar(50) DEFAULT NULL;
DECLARE device_state varchar(50) DEFAULT NULL;
DECLARE cur CURSOR FOR SELECT device_id ,MAX(last_update) AS MAXIMUM FROM  device_log  where  ( DATE_FORMAT(get_local_time(last_update,zone),'%Y%m%d')+0) < (date_time+0) and organization_id=org_id  and (select device_model_id from  device_uid  where id=device_id)=model_id  GROUP BY device_id;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
SET last_state_date = (select get_local_time(timestamp,zone) from organization_log where DATE_FORMAT(get_local_time(timestamp,zone),'%Y%m%d') = date_time and organization_id = org_id and state = 'normal');
open cur;
REPEAT  
FETCH cur INTO device_uid,time;
if not done then 
SET device_state=(select state from device_log where device_id = device_uid and last_update = time and organization_id = org_id);
SET count = (select count(device_id) from device_log where DATE_FORMAT(get_local_time(last_update,zone),'%Y%m%d')=date_time and organization_id = org_id and device_id = device_uid);
IF(device_state='register') THEN
IF (ISNULL(last_state_date) = 0 && count = 0) THEN 
SET num = num+1;
END IF;
IF (ISNULL(last_state_date) = 1 && count = 0) THEN 
SET num = num+1;
END IF;
END IF;
end if;
UNTIL done END REPEAT;
CLOSE cur;
SET total_ago = num;
end ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `device_budget` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `device_budget`(IN org_id INT,IN zone VARCHAR(16),OUT budget_points INT)
BEGIN
DECLARE to_decuting INT default 0;
DECLARE force_decuting INT default 0;
set @is_deducting=0;
call generate_organization_interval(org_id,zone,to_decuting,force_decuting,@is_deducting,@start_time,@end_time,@cycle);
IF((select datediff(@end_time,@start_time))>=0) THEN
set @is_deducting=(IFNULL(@is_deducting,0));
START TRANSACTION;
UPDATE organization SET state='deducting' WHERE id=org_id;
insert into organization_log(organization_id,state) values(org_id,'deducting');
set budget_points =floor(deduct_point(org_id,zone,@start_time,@end_time,@cycle));
UPDATE organization SET state='normal' WHERE id=org_id;
insert into organization_log(organization_id,state) values(org_id,'normal');
IF @@error_count = 0 THEN
COMMIT;
ELSE
ROLLBACK;
END IF;
END IF; 
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `generate_organization_interval` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `generate_organization_interval`(IN org_id INT,IN zone VARCHAR(16),IN to_deducting INT,IN force_deducting INT,OUT is_deducting INT,OUT start_time VARCHAR(32),OUT end_time VARCHAR(32),OUT cycle VARCHAR(10))
BEGIN
DECLARE last_state_update VARCHAR(32);
DECLARE local_time_temp VARCHAR(32);
DECLARE start_time_temp VARCHAR(32);
SELECT organization.last_state_update,billing_profile.cycle INTO last_state_update,cycle FROM organization,organization_group,billing_profile WHERE organization.group_id=organization_group.id AND organization_group.profile_id=billing_profile.id AND organization.id=org_id;
SET local_time_temp=get_local_time(now(),zone);
IF(force_deducting=1) THEN
IF(cycle='month') THEN
SET local_time_temp=get_interval_day(local_time_temp,-dayofmonth(local_time_temp)+1);
END IF;
IF(cycle='week') THEN
SET local_time_temp=get_interval_day(local_time_temp,-dayofweek(local_time_temp)+1);
END IF;
END IF;
IF(to_deducting=1) THEN
SET end_time=get_interval_day(local_time_temp,-1);
ELSE
SET end_time=local_time_temp;
END IF;
IF(cycle='week') THEN
IF(SELECT dayofweek(local_time_temp)='1') THEN
SET is_deducting=1;
END IF;
SET end_time=(SELECT subdate(end_time,date_format(end_time,'%w')-6));
SET start_time_temp=(SELECT subdate(end_time,date_format(end_time,'%w')));
SET start_time=(SELECT CASE WHEN datediff(start_time_temp,get_local_time(last_state_update,zone))<0 THEN get_local_time(last_state_update,zone) ELSE start_time_temp END);
END IF;
IF(cycle='month') THEN 
IF(SELECT dayofmonth(local_time_temp)='1') THEN
SET is_deducting=1;
END IF;
SET end_time=(SELECT last_day(end_time));
SET start_time_temp=(SELECT subdate(end_time,date_format(end_time,'%d')-1));
SET start_time=(SELECT CASE WHEN datediff(start_time_temp,get_local_time(last_state_update,zone))<0 THEN get_local_time(last_state_update,zone) ELSE start_time_temp END);
END IF;
IF(cycle='day') THEN
SET is_deducting=1;
SET start_time=end_time;
END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `get_device_budget` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `get_device_budget`(IN org_id INT)
BEGIN
DECLARE l_time_zone VARCHAR(16);
set @org_points=0;
set l_time_zone=(select time_zone from organization where id=org_id);
call device_budget(org_id,l_time_zone,@org_points);
select @org_points;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `license_deducting` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = '' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `license_deducting`(IN org_id INT,IN zone VARCHAR(16),IN force_deducting INT)
BEGIN
DECLARE org_points int default 0;
DECLARE l_next_cycle_point INT default 0;
DECLARE l_remaining_point INT default 0;
DECLARE to_decuting INT default 1;
DECLARE bill_id INT default 0;
DECLARE before_deducting INT default 0;
set before_deducting=check_org_deducting(org_id);
IF(before_deducting=1) THEN
set @deducting=0;
call generate_organization_interval(org_id,zone,to_decuting,force_deducting,@deducting,@start_time,@end_time,@cycle);
IF((select datediff(@end_time,@start_time))>=0) THEN
set @deducting=(IFNULL(@deducting,0));
IF(@deducting=1) THEN
START TRANSACTION;
UPDATE organization SET state='deducting' WHERE id=org_id;
insert into organization_log(organization_id,state) values(org_id,'deducting');
set org_points=floor(deduct_point(org_id,zone,@start_time,@end_time,@cycle));
INSERT INTO billing_history(organization_id,expense)VALUES(org_id,org_points);
SET bill_id=(select id from billing_history where organization_id=org_id and time_stamp like concat(curdate(),'%'));
call deduct_license(org_id,org_points,bill_id);
delete from device where unregister_time!='0000-00-00 00:00:00' and organization_id=org_id;
SET l_remaining_point=IFNULL((select SUM((select SUM(remaining_point) from license where organization_id=org_id))),0);
SET l_next_cycle_point=budget_point_device_all_time(org_id);
UPDATE organization SET expense_per_unit=l_next_cycle_point WHERE id=org_id;
IF (l_remaining_point<l_next_cycle_point) THEN
UPDATE organization SET state='exhausted' WHERE id=org_id;
insert into organization_log(organization_id,state) values(org_id,'exhausted');
ELSE
UPDATE organization SET state='normal' WHERE id=org_id;
insert into organization_log(organization_id,state) values(org_id,'normal');
END IF;
IF @@error_count = 0 THEN
COMMIT;
ELSE
ROLLBACK;
END IF;  
END IF;
END IF;
END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2014-12-04 14:47:14
