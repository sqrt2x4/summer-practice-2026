*** Settings ***
Resource  ../resources/keywords.robot
Resource  ../resources/variables.robot

Suite Setup    Load Project and Login

Test Setup    Run Keywords     
...    Go To Page    Devices    AND
...    Remove All Devices

*** Test Cases ***
Add New Device:
    Add New Device     AirScale BTS 1    TIM Test Lab    09:30    23:00    2    20
    Check Device Info  AirScale BTS 1    TIM Test Lab    09:30    23:00    2    20

Edit Device:
    Click Device Option    AirScale BTS 1    Edit
    Fail    Test case not implemented yet

Remove Device:
    Fail    Test case not implemented yet