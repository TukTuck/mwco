#!/bin/sh
# Gradle wrapper script
APP_NAME="Gradle"
APP_BASE_NAME=${0##*/}
exec java -jar "$(dirname "$0")/gradle/wrapper/gradle-wrapper.jar" "$@"
