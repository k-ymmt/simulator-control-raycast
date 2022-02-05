import {ActionPanel, CopyToClipboardAction, Icon, List, PushAction, showHUD, ShowInFinderAction} from "@raycast/api";
import {execSync} from "child_process";
import {useEffect, useState} from "react";

type OS = {
    name: string
    version: string
}

type Device = {
    os: OS
    udid: string
    isAvailable: boolean
    state: string
    name: string
    dataPath: string
}

export default function Command() {
    return (
        <List>
            <List.Item
                title="Simulators"
                icon={Icon.List}
                actions={
                    <ActionPanel>
                        <PushAction title="Show" target={<SimulatorList/>}/>
                    </ActionPanel>
                }
            />
        </List>
    )
}

function SimulatorList(): JSX.Element {
    const [isLoading, setIsLoading] = useState(true)
    const [simulators, setSimulators] = useState<[string, Device[]][]>([])

    useEffect(() => {
        const result = execSync('xcrun simctl list -j devices available').toString()
        const list = JSON.parse(result)

        const simulators = Object.entries(list['devices'])
            .flatMap(([key, value]) => makeDevices(key, value as Omit<Device, 'os'>[]))
            .reduce((simulators, current) => {
                const simulator = simulators.find(([name,]) => name === current.os.name)
                if (simulator) {
                    simulator[1].push(current)
                } else {
                    simulators.push([current.os.name, [current]])
                }

                return simulators
            }, [] as [string, Device[]][])
        setSimulators(simulators)
        setIsLoading(false)
    }, [])

    return <List isLoading={isLoading}>
        {simulators.map(([name, devices]) =>
            <List.Section title={name} key={name}>
                {devices.map((device) =>
                    <List.Item
                        key={device.udid}
                        title={`${device.name}(${device.os.version})`}
                        actions={
                            <ActionPanel>
                                <CopyToClipboardAction title="Copy UDID to Clipboard" content={device.udid}/>
                                <ActionPanel.Item icon={Icon.Upload} title="Boot" onAction={() => boot(device.udid)}/>
                                <ShowInFinderAction title="Show Data Path in Finder" path={device.dataPath} />
                            </ActionPanel>
                        }
                    />
                )}
            </List.Section>)
        }
    </List>
}

function makeDevices(key: string, devices: Omit<Device, 'os'>[]): Device[] {
    const [name, ...versionStrings] = key.split('.').slice(-1)[0].split('-')
    const version = versionStrings.join('.')
    return devices.map((device) => {
        return {os: {name, version}, ...device}
    })
}

async function boot(udid: string) {
    try {
        execSync(`xcrun simctl boot ${udid}`)
    } catch (e) {
        await showHUD(e as string)
    }

    await showHUD('booted')
}
