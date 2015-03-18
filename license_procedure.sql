/************zhuqx add for deducting sql**********/

/*get_local_time_zone-获取当前timezone*/
DELIMITER $$
DROP FUNCTION IF EXISTS get_local_time_zone $$
CREATE FUNCTION get_local_time_zone() RETURNS VARCHAR(32)
BEGIN
DECLARE ret_val VARCHAR(32);
SET ret_val=(select substring_index(timediff(now(),utc_timestamp()),':',2));
IF (LENGTH(ret_val) < 6) THEN
SET ret_val=CONCAT('+',ret_val);
END IF;
RETURN ret_val;
END $$
DELIMITER ;


/*get_local_time-获取zone的本地时间*/
DELIMITER $$
DROP FUNCTION IF EXISTS get_local_time $$
CREATE FUNCTION get_local_time(local_time VARCHAR(32),zone VARCHAR(16)) RETURNS VARCHAR(32)
BEGIN
DECLARE ret_val VARCHAR(32);
IF(local_time='0000-00-00 00:00:00') THEN
SET ret_val=local_time;
ELSE
SET ret_val=(select convert_tz(local_time,(select get_local_time_zone()),zone));
END IF;
RETURN ret_val;
END $$
DELIMITER ;

/*get_interval_day-获取和local_time差几天的时间 */
DELIMITER $$
DROP FUNCTION IF EXISTS get_interval_day $$
CREATE FUNCTION get_interval_day(local_time VARCHAR(32),interval_day INT) RETURNS VARCHAR(32)
BEGIN
DECLARE ret_val VARCHAR(32);
SET ret_val=(select date_format(DATE_ADD(local_time,INTERVAL interval_day day),'%Y-%m-%d %H:%i:%s'));
RETURN ret_val;
END $$
DELIMITER ;

/*generate_organization_interval-生成结算区间---此时的结束时间是对于上一个结算周期而言，如果是实时结算需要用当前时间为结束时间，根据结束时间计算起始时间）*/
DELIMITER $$
DROP PROCEDURE IF EXISTS generate_organization_interval $$
CREATE PROCEDURE generate_organization_interval(IN org_id INT,IN zone VARCHAR(16),IN to_deducting INT,OUT start_time VARCHAR(32),OUT end_time VARCHAR(32),OUT cycle VARCHAR(10),OUT cycle_start_time VARCHAR(32))
BEGIN
DECLARE last_state_update VARCHAR(32);
DECLARE local_time_temp VARCHAR(32);
DECLARE start_time_temp VARCHAR(32);
SELECT organization.last_state_update,billing_profile.cycle INTO last_state_update,cycle FROM organization,organization_group,billing_profile WHERE organization.group_id=organization_group.id AND organization_group.profile_id=billing_profile.id AND organization.id=org_id;
SET local_time_temp=get_local_time(now(),zone);
IF(cycle='month') THEN
SET local_time_temp=get_interval_day(local_time_temp,-dayofmonth(local_time_temp)+1);
END IF;
IF(cycle='week') THEN
SET local_time_temp=get_interval_day(local_time_temp,-dayofweek(local_time_temp)+1);
END IF;
IF(to_deducting=1) THEN
SET end_time=get_interval_day(local_time_temp,-1);
ELSE
SET end_time=local_time_temp;
END IF;
IF(cycle='week') THEN
SET end_time=(SELECT subdate(end_time,date_format(end_time,'%w')-6));
SET start_time_temp=(SELECT subdate(end_time,date_format(end_time,'%w')));
SET end_time=(SELECT date_format(end_time,'%Y-%m-%d 23:59:59'));
SET start_time_temp=(SELECT date_format(start_time_temp,'%Y-%m-%d 00:00:00'));
SET cycle_start_time=start_time_temp;
SET start_time=(SELECT CASE WHEN datediff(start_time_temp,get_local_time(last_state_update,zone))<0 THEN get_local_time(last_state_update,zone) ELSE start_time_temp END);
END IF;
IF(cycle='month') THEN 
SET end_time=(SELECT last_day(end_time));
SET start_time_temp=(SELECT subdate(end_time,date_format(end_time,'%d')-1));
SET end_time=(SELECT date_format(end_time,'%Y-%m-%d 23:59:59'));
SET start_time_temp=(SELECT date_format(start_time_temp,'%Y-%m-%d 00:00:00'));
SET cycle_start_time=start_time_temp;
SET start_time=(SELECT CASE WHEN datediff(start_time_temp,get_local_time(last_state_update,zone))<0 THEN get_local_time(last_state_update,zone) ELSE start_time_temp END);
END IF;
IF(cycle='day') THEN
SET start_time_temp=end_time;
SET end_time=(SELECT date_format(end_time,'%Y-%m-%d 23:59:59'));
SET start_time_temp=(SELECT date_format(start_time_temp,'%Y-%m-%d 00:00:00'));
SET cycle_start_time = start_time_temp;
IF(start_time_temp<get_local_time(last_state_update,zone)) THEN
SET start_time=get_local_time(last_state_update,zone);
ELSE
SET start_time=start_time_temp;
END IF;
END IF;
END $$
DELIMITER ;



/*budget_point_device_all_time-预算---计算当前在线设备整个周期需要扣除的点数*/
DELIMITER $$
DROP FUNCTION IF EXISTS budget_point_device_all_time $$
CREATE FUNCTION budget_point_device_all_time(org_id INT) RETURNS INT(11)
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
END $$
DELIMITER ;


/*deduct_point-结算---计算organization需要扣除的点数,同时插入billing_device_log */
DELIMITER $$
DROP FUNCTION IF EXISTS deduct_point $$
CREATE FUNCTION deduct_point(to_deducting INT,org_id INT,zone VARCHAR(16),start_time VARCHAR(32),end_time VARCHAR(32),cycle VARCHAR(10)) RETURNS float(15,4)
BEGIN
DECLARE ret_val float default 0;
DECLARE online_days INT default 0;
DECLARE device_expense INT default 0;
DECLARE done int default 0;
DECLARE bill_id INT default 0;
DECLARE l_device_model_id VARCHAR(32);
DECLARE l_device_model_count int default 0;
DECLARE my_cursor CURSOR FOR select device_model.id,count(DISTINCT device.device_id) from device,device_uid,device_model where device.organization_id=org_id and device.device_id=device_uid.id and device_uid.device_model_id=device_model.id group by device_model.id;    
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
Open my_cursor;
booking_loop:loop
FETCH my_cursor into l_device_model_id,l_device_model_count; 
if done=1 then
    leave booking_loop;
end if;
SET online_days=(select SUM((datediff((SELECT CASE WHEN (unregister_time="0000-00-00 00:00:00" or (datediff(end_time,get_local_time(unregister_time,zone))<=0)) THEN end_time ELSE (get_local_time(unregister_time,zone)) END),(SELECT CASE WHEN (datediff(start_time,(get_local_time(register_time,zone)))>0) THEN start_time ELSE (get_local_time(register_time,zone)) END))+1)) as result from device,device_uid where device.device_id=device_uid.id and organization_id=org_id and device_uid.device_model_id=l_device_model_id and (unregister_time='0000-00-00 00:00:00' or datediff(start_time,get_local_time(unregister_time,zone))<=0) and (datediff(start_time,get_local_time(register_time,zone))>=0));
SET device_expense=(select billing_profile_device.expense from billing_profile_device,organization,organization_group where organization.id=org_id and organization.group_id=organization_group.id and organization_group.profile_id=billing_profile_device.profile_id and billing_profile_device.device_model_id=l_device_model_id);
IF(online_days<0) THEN
SET online_days=0;
END IF;
IF(cycle='week') THEN
SET ret_val=ret_val+(IFNULL((select round(device_expense*online_days/7,4)),0));
END IF;
IF(cycle='month') THEN
SET ret_val= ret_val+(IFNULL((select round((device_expense*online_days/(select day(last_day(end_time)))),4)),0));
END IF;
IF(cycle='day') THEN
SET ret_val=ret_val+(IFNULL(device_expense*online_days,0)); 
END IF;
IF(to_deducting=1) THEN
SET bill_id=(select id from billing_history where organization_id=org_id order by last_update DESC LIMIT 1);
INSERT INTO billing_device_log(billing_id,model_id,count,total_time) values(bill_id,l_device_model_id,l_device_model_count,online_days);
END IF;
end loop booking_loop;
close my_cursor;
RETURN ret_val;
END $$
DELIMITER ;


/*get_device_budget-获取假设当前设备到这个周期末所需要的点数*/
DELIMITER $$
DROP PROCEDURE IF EXISTS get_device_budget $$
CREATE PROCEDURE get_device_budget(IN org_id INT)
BEGIN
DECLARE l_time_zone VARCHAR(16);
DECLARE to_decuting INT default 0;
DECLARE budget_points INT default 0;
SET l_time_zone=(select time_zone from organization where id=org_id);
call generate_organization_interval(org_id,l_time_zone,to_decuting,@start_time,@end_time,@cycle,@cycle_start_time);
IF((select datediff(@end_time,@start_time))>=0) THEN
START TRANSACTION;
UPDATE organization SET state='deducting' WHERE id=org_id;
INSERT INTO organization_log(organization_id,reason,state) values(org_id,'Real time deduct','deducting');
SET budget_points =floor(deduct_point(to_decuting,org_id,l_time_zone,@start_time,@end_time,@cycle));
UPDATE organization SET state='normal' WHERE id=org_id;
INSERT INTO organization_log(organization_id,reason,state) values(org_id,'Real time deduct end','normal');
IF @@error_count = 0 THEN
COMMIT;
ELSE
ROLLBACK;
END IF;
END IF; 
select budget_points;
END $$
DELIMITER ;

/*license_accounts-从license扣钱，并更新没有扣完的license的点数,同时每笔记录有更新入license_log或者扣完则存入license_log_history*/
DELIMITER $$
DROP PROCEDURE IF EXISTS deduct_license $$
CREATE PROCEDURE deduct_license(IN org_id INT,IN org_points INT,IN l_bill_id INT)
BEGIN
DECLARE done int default 0;
DECLARE points INT default 0;
DECLARE ret_val INT default 0;
DECLARE l_license_id VARCHAR(32);
DECLARE my_cursor CURSOR FOR select id from license where organization_id=org_id and remaining_point!=0 order by last_update ASC;     
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
Open my_cursor;
SET ret_val=org_points;
REPEAT
FETCH my_cursor into l_license_id; 
SET points=(select remaining_point from license where id=l_license_id);
IF(ret_val >= points) THEN
SET ret_val=(ret_val-points);
INSERT INTO license_log(organization_id,license_id,billing_id,change_point,action)VALUES(org_id,l_license_id,l_bill_id,-points,'deduct');
UPDATE license SET remaining_point=0 WHERE id=l_license_id and organization_id=org_id;
INSERT INTO license_history(id,organization_id,user_id,original_point,remaining_point,po_number,expiration,last_update) select id,organization_id,user_id,original_point,remaining_point,po_number,expiration,last_update from license where id=l_license_id;
DELETE FROM license where id=l_license_id;
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
END $$
DELIMITER ;

/*get_error_msg-进入结算周期，结算周期的organizaiton扣除点数处理---按照organization license时间先后顺序扣除并且一系列后续操作*/
DELIMITER $$
DROP FUNCTION IF EXISTS get_error_msg $$
CREATE FUNCTION get_error_msg(error_type VARCHAR(8),org_id INT,para1 INT,para2 INT,start_time VARCHAR(32),end_time VARCHAR(32)) RETURNS VARCHAR(300)
BEGIN
DECLARE error_msg VARCHAR(300);
DECLARE organization_name VARCHAR(32);
SET organization_name=(SELECT name from organization where id=org_id);
SET error_msg=(SELECT CONCAT('{"organization_id":','"',organization_name,'",'));
SET error_msg=(SELECT CONCAT(error_msg,'"start_time":','"',start_time,'",'));
SET error_msg=(SELECT CONCAT(error_msg,'"end_time":','"',end_time,'",'));
IF(error_type='SQL') THEN
SET error_msg=(SELECT CONCAT(error_msg,'"error_count":',CAST(para1 AS CHAR),','));
SET error_msg=(SELECT CONCAT(error_msg,'"error_message":','"'));
SET error_msg=(SELECT CONCAT(error_msg,'there are some SQL execution errors during the transaction','"}'));
ELSE
SET error_msg=(SELECT CONCAT(error_msg,'"remaining_points":',CAST(para1 AS CHAR),','));
SET error_msg=(SELECT CONCAT(error_msg,'"deducting_points":',CAST(para2 AS CHAR),','));
SET error_msg=(SELECT CONCAT(error_msg,'"error_message":','"'));
SET error_msg=(SELECT CONCAT(error_msg,'the remaining points are not enough to be deducted','"}'));
END IF;
return error_msg;
END $$
DELIMITER ;

/*license_deducting-进入结算周期，结算周期的organizaiton扣除点数处理---按照organization license时间先后顺序扣除并且一系列后续操作*/
DELIMITER $$
DROP PROCEDURE IF EXISTS license_deducting $$
CREATE PROCEDURE license_deducting(IN org_id INT,IN zone VARCHAR(16),OUT need_deduct INT,OUT error_deduct INT,OUT error_msg VARCHAR(254))
BEGIN
DECLARE org_points int default 0;
DECLARE l_next_cycle_point INT default 0;
DECLARE l_remaining_point INT default 0;
DECLARE to_decuting INT default 1;
DECLARE bill_id INT default 0;
DECLARE need_deducting INT default 0;
SET need_deducting=check_org_deducting(org_id);
SET need_deduct=0;
SET error_deduct=0;
SET error_msg='';
IF(need_deducting=1) THEN
SET need_deduct=1;
call generate_organization_interval(org_id,zone,to_decuting,@start_time,@end_time,@cycle,@cycle_start_time);
IF((select datediff(@end_time,@start_time))>=0) THEN
START TRANSACTION;
UPDATE organization SET state='deducting' WHERE id=org_id;
INSERT INTO billing_history(organization_id,expense,start_time,end_time)VALUES(org_id,0,@cycle_start_time,@end_time);
SET bill_id=IFNULL((select id from billing_history where organization_id=org_id order by last_update DESC LIMIT 1),-1);
SET org_points=floor(deduct_point(to_decuting,org_id,zone,@start_time,@end_time,@cycle));
UPDATE billing_history SET expense=org_points where id=bill_id;
SET l_remaining_point=IFNULL((select SUM((select SUM(remaining_point) from license where organization_id=org_id))),0);
IF (l_remaining_point < org_points) THEN
SET error_deduct=1;
SET error_msg=get_error_msg('POINTS',org_id,l_remaining_point,org_points,@cycle_start_time,@end_time);
ROLLBACK;
ELSE
IF (org_points!=0) THEN
call deduct_license(org_id,org_points,bill_id);
END IF;
delete from device where unregister_time!='0000-00-00 00:00:00' and (datediff(@end_time,get_local_time(unregister_time,zone))>=0) and organization_id=org_id;
SET l_remaining_point=IFNULL((select SUM((select SUM(remaining_point) from license where organization_id=org_id))),0);
SET l_next_cycle_point=budget_point_device_all_time(org_id);
UPDATE organization SET expense_per_unit=l_next_cycle_point WHERE id=org_id;
IF (l_remaining_point<l_next_cycle_point || l_remaining_point=0) THEN
UPDATE organization SET state='exhausted' WHERE id=org_id;
INSERT INTO organization_log(organization_id,reason,state) values(org_id,'deduct end','exhausted');
ELSE
UPDATE organization SET state='normal' WHERE id=org_id;
INSERT INTO organization_log(organization_id,reason,state) values(org_id,'deduct end','normal');
END IF;
IF @@error_count = 0 THEN
COMMIT;
ELSE
SET error_deduct=1;
SET error_msg=get_error_msg('SQL',org_id,@@error_count,0,@cycle_start_time,@end_time);
ROLLBACK;
END IF;  
END IF;
END IF;
END IF;
END $$
DELIMITER ;


/*check_org_deducting-结算---检查organization是否需要结算0-不需要 1-需要 */
DELIMITER $$
DROP FUNCTION IF EXISTS check_org_deducting $$
CREATE FUNCTION check_org_deducting(org_id INT) RETURNS INT(4)
BEGIN
DECLARE ret_val INT default 0;
DECLARE org_state VARCHAR(10);
DECLARE zone VARCHAR(10);
DECLARE bill_time_stamp VARCHAR(32);
DECLARE to_decuting INT default 1;
DECLARE local_time_temp VARCHAR(32);
SELECT organization.state,organization.time_zone INTO org_state,zone FROM organization,organization_group,billing_profile WHERE organization.group_id=organization_group.id AND organization_group.profile_id=billing_profile.id AND organization.id=org_id;
IF(org_state='normal') THEN
call generate_organization_interval(org_id,zone,to_decuting,@start_time,@end_time,@cycle,@cycle_start_time);
IF((select datediff(@end_time,@start_time))>=0) THEN
SET bill_time_stamp=IFNULL((select last_update from billing_history where organization_id=org_id order by last_update DESC LIMIT 1),'0');
IF (bill_time_stamp='0') THEN
SET ret_val=1;
ELSE
SET local_time_temp=get_local_time(bill_time_stamp,zone);
IF((select datediff(@end_time,local_time_temp))>=0) THEN
SET ret_val=1;
ELSE
SET ret_val=0;
END IF;
END IF;
END IF;
ELSE
SET ret_val=0;
END IF;
RETURN ret_val;
END $$
DELIMITER ;


/*deduct_org_procedure-结算处理---强制计算所有需要结算的organization并处理*/
DELIMITER $$
DROP PROCEDURE IF EXISTS deduct_org_procedure $$
CREATE PROCEDURE deduct_org_procedure()
BEGIN
DECLARE total_org int default 0;
DECLARE error_org int default 0;
DECLARE error_message VARCHAR(65535);
DECLARE cycle_start_time VARCHAR(32);
DECLARE cycle_end_time VARCHAR(32);
DECLARE temp_time VARCHAR(200);
DECLARE done int default 0;
DECLARE o int;
DECLARE ordernumbers CURSOR FOR select id from organization where state='normal';     
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
SET error_message='';
Open ordernumbers;
booking_loop:loop
FETCH ordernumbers into o; 
if done=1 then
    leave booking_loop;
end if;
call license_deducting(o,(select time_zone from organization where id=o),@need_deduct,@error_deduct,@error_msg);
IF(@need_deduct=1) THEN
SET total_org=total_org+1;
END IF;
IF(@error_deduct=1) THEN
SET error_org=error_org+1;
IF(error_message='') THEN
SET error_message=@error_msg;
SET temp_time=(SELECT substring_index(error_message,',"end_time":',1));
SET cycle_start_time=(SELECT substring_index(temp_time,',"start_time":',-1));
SET temp_time=(SELECT substring_index(error_message,',"end_time":',-1));
SET cycle_end_time=(SELECT substring_index(temp_time,',',1));
ELSE
SET error_message=(select CONCAT(error_message,',',@error_msg));
END IF;
END IF;
end loop booking_loop;
close ordernumbers;
INSERT INTO billing_log(total_org,error_org,error_message,start_time,end_time) VALUES(total_org,error_org,error_message,cycle_start_time,cycle_end_time);
END $$
DELIMITER ;

/*触发器，更新状态时候输入last_state_update=*/
DELIMITER $$
DROP TRIGGER IF EXISTS trig0 $$
CREATE TRIGGER trig0 BEFORE UPDATE ON organization FOR EACH ROW
BEGIN
IF((new.state = 'normal' and old.state = 'exhausted') or (new.state = 'exhausted' and old.state = 'normal') or new.state = 'removed') THEN
SET new.last_state_update=NOW();
END IF;
END $$
DELIMITER ;

/*触发器，插入时候输入last_state_update=*/
DELIMITER $$
DROP TRIGGER IF EXISTS trig1 $$
CREATE TRIGGER trig1 BEFORE INSERT ON organization FOR EACH ROW
BEGIN
SET new.last_state_update=NOW();
END $$
DELIMITER ;

/*事件每个整点执行一次***/
DELIMITER $$
DROP event IF EXISTS LS_EVENT $$
create event if not exists LS_EVENT on schedule every 1 hour
 starts date_add(DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00'),INTERVAL 1 hour) 
 on completion preserve do
BEGIN
 call deduct_org_procedure();
END $$
DELIMITER ;


SET @@global.event_scheduler = 1;

