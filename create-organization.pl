#!/usr/bin/perl -w
use strict;

my $cmd = 'curl -u "DJP:yhUMAXaSY8Aj" ';
my $url = 'http://172.18.190.38:9502/api/v1/organization ';
my $opt = '-X POST -H "Content-Type:application/json" ';
my $req0 = '-d \'{"requests":[{"organization_id":"org';
my $req1 = '","belongs_to_name":"ICBC","belongs_to_type":"obu","time_zone":"+08:00"}]}\' ';

sub spawTestProcess() {
	for (my $orgId = 0; $orgId < 1; $orgId++) {
		#print '.';
	    my $c = $cmd.$url.$opt.$req0.$orgId.$req1;
		print $c;
	}
}

print 'Begin to spaw test processes...', "\n";
spawTestProcess();

