Monitor for Victron MPPT Smart solar
====================================
This project contains some arduino software (+ a hardware proposal) to interface to a Victron MPPT smart solar charger and read out it's data.
The data is processed and partially stored on the arduino.
The project has 2 goals:

* monitor the charger (over time)
* provide an output that controls an AES fridge to use solar power when the batteries are fully charged and there is enough solar power.

Additionally there is some python based server that can run e.g. on a raspberry pi, query the arduino and provide a nice GUI to monitor and control the software.

The arduino features a state machine and will enable the AES output when the charger is in the floating state for a configurable amount of time. Afterwards the AES output will be on for some min time - an can be kept on as long as the voltage does not drop below some min level - or a max time is reached.

License : [MIT](mit.txt) 