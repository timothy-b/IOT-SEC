# Setup

## Prelude

It's somewhat arbitrary that this project makes use of a Raspberry Pi and a Particle Photon - they're what I had on hand at the time, although they're both popular, inexpensive, well-supported, easy to use, entry-level devices, so they're decent choices nonetheless. If I were to build this project again, I might use a single Arduino device in order to bypass having to use Particle's third-party cloud services (though very user friendly), and reduce overall system complexity. Such an Arduino would only have to be able to make use of GPIO pins, perform ARP scans, and send HTTP requests. A single Raspberry Pi could do this. However, it may also be preferrable to separate concerns between devices; to use one sensor and one web server / device hub, as the beginnings of a hub-and-spoke IOT design pattern.

## Raspberry Pi

First, [install](https://www.raspberrypi.org/documentation/installation/installing-images/README.md) your distro of choice. I used Raspbian since I'm familiar with Debian.

Second, [set up SSH](https://www.raspberrypi.org/documentation/remote-access/ssh/) so that you can remotely connect to your Pi. You'll also need to forward the ports on your modem and/or router so that you can reach your Pi from outside your network. Here's [a guide](https://portforward.com/router.htm) for that.

After that, there are some good mobile apps for managing your Pi you might want to consider. None of these are strictly necessary.

-   [JuiceSSH](https://play.google.com/store/apps/details?id=com.sonelli.juicessh) is a great SSH app.
-   [Raspberry Lite SSH Buttons](https://play.google.com/store/apps/details?id=uk.co.knowles_online.raspberrysshlite) is good for running scripts without fumbling around with SSH.
-   [RasPi Check](https://play.google.com/store/apps/details?id=de.eidottermihi.raspicheck) is useful for checking the status of your Pi and troubleshooting.

Next you'll need to install NPM and Node. Unfortunately, on the Raspberry Pi 1 this isn't as simple as `apt-get install npm`. Here's [a simple guide](https://bloggerbrothers.com/2017/03/04/installing-nodejs-on-a-raspberry-pi/) I used to download and install from source. Note: don't install Node 6, that's old.

Next, you'll need to get my project files to your Pi. I don't have any releases or install scripts yet, so you can copy the files from Github, or just `apt-get install git` and `git clone https://github.com/timothy-b/IOT-SEC.git`.

Next install the arp-scan dependency: `apt-get install arp-scan`

Next fill in the appropriate values in `config.ts`.

Next, you can run `node tests/test-whatever.js` to run different tests and `node program.js` as admin to run the web server program.

Next, install dependencies with `npm install` and then transpile typescript with `tsc`.

Finally, install the program as a service with Systemd. Create a file `/etc/systemd/system/iotsec.service` with the following config:

```
[Unit]
Description=IOT-SEC
Documentation=github.com/timothy-b/iot-sec
After=multi-user.target

[Service]
Type=idle
ExecStart=/usr/bin/node /home/pi/IOT-SEC/src/program.js

[Install]
WantedBy=multi-user.target
```

And then `sudo systemctl enable iotsec` and reboot!

## Particle Photon

If you don't have basic working familiarity with your Photon, you should follow Particle's [Getting Started](https://docs.particle.io/guide/getting-started/start/photon/) guide first, at least to the point where you've walked through a few of their code examples.

### Wiring the circuit

Wire according to [the schematic provided](IOT-SEC_Schematic.png). Note that the Hall Sensor requires a resistor between its input and output pins - I didn't notice this mentioned anywhere I looked online.

### Particle cloud configuration

You'll need to set up a webhook for the Photon to send messages to the Raspberry Pi. The example configuration has basic HTTP authentication enabled by default, but you can disable it by flipping the `Config.basicAuthentication.enabled` flag to `false`. Basic HTTP authentication is easy to setup and use, so I wouldn't recommend disabling it.

For setting up the webhook, see: https://docs.particle.io/guide/tools-and-features/webhooks/

## Network

Aside from forwarding port 22, you'll also need a static IP or Dynamic DNS so that your Particle config stays pointed at your home address. I went with noip.com because my router supported it, and they offer a free basic service provided you re-confirm your registration every 30 days. Their reconfirmation process signs you in with a magic link and has you complete a recaptcha, so it only takes about 30 seconds. Here's their guide to getting DDNS set up: https://www.noip.com/support/knowledgebase/getting-started-with-no-ip-com/
