#!/bin/sh
# Early startup of VelocityMind predictive preloading daemon
if [ -x /usr/bin/velocitymind ]; then
    echo "Starting VelocityMind preloader early in boot..."
    /usr/bin/velocitymind &
fi
