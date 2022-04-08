#!/bin/bash

if git describe --exact-match HEAD ; then
    echo "New tag found, publishing a new release"
    exit 1;
else
    echo "No new tags, build cancelled"
    exit 0;
fi
