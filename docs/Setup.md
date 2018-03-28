# Setup
## Raspberry Pi
First, [install](https://www.raspberrypi.org/documentation/installation/installing-images/README.md) your distro of choice. I used Raspbian since I'm familiar with Debian.

Second, [set up SSH](https://www.raspberrypi.org/documentation/remote-access/ssh/) so that you can remotely connect to your Pi. You'll also need to forward the ports on your modem and/or router so that you can reach your Pi from outside your network. Here's [a guide](https://portforward.com/router.htm) for that.

After that, there are some good mobile apps for managing your Pi you might want to consider. None of these are strictly necessary.

* [JuiceSSH](https://play.google.com/store/apps/details?id=com.sonelli.juicessh) is a great SSH app.
* [Raspberry Lite SSH Buttons](https://play.google.com/store/apps/details?id=uk.co.knowles_online.raspberrysshlite) is good for running scripts without fumbling around with SSH.
* [RasPi Check](https://play.google.com/store/apps/details?id=de.eidottermihi.raspicheck) is useful for checking the status of your Pi and troubleshooting.

Next you'll need to install NPM and Node. Unfortunately, on the Raspberry Pi 1 this isn't as simple as `apt-get install npm`. Here's [a simple guide](https://bloggerbrothers.com/2017/03/04/installing-nodejs-on-a-raspberry-pi/) I used to download and install from source. Note: don't install Node 6, that's old.

Next, you'll need to get my project files to your Pi. I don't have any releases or install scripts yet, so you can copy the files from Github I suppose, or just `apt-get install git` and `git clone https://github.com/timothy-b/IOT-SEC.git`.

Then you can run `node test-whatever.js` to test different modules and `node program.js` to run the program.

## Particle Photon
### Wiring the circuit
### Particle cloud configuration
### Installing and testing the software
## Network
Aside from forwarding port 22, you'll also need a static IP or Dynamic DNS so that your Particle config stays pointed at your home address.