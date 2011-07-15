#!/usr/bin/perl

#
# Configuration
#

use strict;
use warnings;

use JSON qw/encode_json/;
use Google::GeoCoder::Smart;
use Data::Dumper;
use Storable;
use Text::CSV;

# Autoflush STDOUT (to easy |tee)
local $| = 1;

my $infile = shift || "source.csv";
my $csvextfile = shift || "extended source.csv";

my $geo = Google::GeoCoder::Smart->new();

my $cachefile = shift || "cache.dat";
my $cache;
if (-f $cachefile) {
	$cache = retrieve($cachefile);
}

my $csv = Text::CSV->new({
	binary	=> 1
}) or die "!! Cannot open CSV: ".Text::CSV->error_diag ();


#
# Routines
#

sub getLocation {
	my $plaats = shift;
	
	if (defined $cache->{$plaats}) {
		print "   Cache hit\n";
		if ($cache->{$plaats} eq "ZERO_RESULTS") {
			return undef;
		}
		return $cache->{$plaats};
	}
	print "   Cache miss\n";
	
	my ($resultnum, $error, @results, $returncontent) = $geo->geocode("address" => $plaats);
	while ($error eq "OVER_QUERY_LIMIT") {
		print "   Throttling...\n";
		sleep(1);
		($resultnum, $error, @results, $returncontent) = $geo->geocode("address" => $plaats);
	}
	if ($error eq "ZERO_RESULTS") {
		$cache->{$plaats} = "ZERO_RESULTS";
		store $cache, $cachefile;
		return;
	}
	elsif ($error ne "OK") {
		die "!! Unknown error '$error'\n";
	}
	$resultnum--;
	if ($resultnum > 0) {
		print "** Multiple results returned, using first one...\n";
	}
	my $lat = $results[0]{geometry}{location}{lat};
	my $lng = $results[0]{geometry}{location}{lng};
	
	$cache->{$plaats} = [$lat, $lng];
	store $cache, $cachefile;
	
	return [$lat, $lng];
}


#
# Parse
#

my $data = {};
open(my $csvext, '>', $csvextfile);
open (my $input, '<', $infile);
while (my $row = $csv->getline($input)) {
	chomp(my $line = $csv->string());
	# Fix inability of CSV_XS to handle UTF8 strings.
	utf8::decode ($_) for @$row;
	if (@$row != 8) {
		print Dumper($row);
		die "!! Invalid amount of fields\n";
	}
	my ($titel, $omschrijving, $datum, $begin, $einde, $plaats, $indoor, $deelnemers) = @$row;
	print "\n$titel\n";
	
	# Location lookup
	print "-- Looking up '$plaats'\n";
	my $result = getLocation($plaats);
	if (not defined $result) {
		my $plaats2 = $plaats;
		$plaats2 =~  s/^.*?,//;
		$result = getLocation($plaats2);
	}
	die "!! Could not look-up location '$plaats'\n" unless (defined $result);
	my ($lat, $lng) = @$result;
	print "   $lat x $lng\n";
	print $csvext "$line;$lat;$lng\n";
	
	# Construct object
	print "-- Constructing object\n";
	my $event = {
		title		=> $titel,
		description	=> $omschrijving,
		type		=> ($indoor ? "indoor" : "outdoor"),
		location	=> {
			latitude	=> $lat,
			longitude	=> $lng,
			description	=> $plaats
		},
		schedule	=> {
			start		=> $begin,
			stop		=> $einde,
			limit		=> $deelnemers
		}
	};
	
	# Index by date
	my ($dag, $maand,  $jaar) = split(/\//, $datum);
	$dag -= 15;
	if ($dag <= 0) {
		print "** Event not within target period\n";
		next;
	}
	$data->{$dag} = [] unless (defined $data->{$dag});
	push $data->{$dag}, $event;
}
$csv->eof or $csv->error_diag();
close($input);
close($csvext);

foreach my $day (keys $data) {
	open (my $output, '>', "gent_events_$day.json");
	print $output encode_json $data->{$day};
	close($output);
}


