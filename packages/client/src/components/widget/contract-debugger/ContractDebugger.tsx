import React from 'react';
import { useState, useEffect } from 'react';
import { AbiItem } from 'web3-utils'

const SIMPLE_STORAGE_ABI = [{"inputs":[],"stateMutability":"payable","type":"constructor"},{"inputs":[],"name":"get","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"x","type":"uint256"}],"name":"set","outputs":[],"stateMutability":"payable","type":"function"}]

export default function ContractDebbuger () {
    const [abi, setAbi] = useState(SIMPLE_STORAGE_ABI);
    const [contractAddr, setContractAddr] = useState();

    useEffect(()=> {
        
    });

    const method_list = (abi: AbiItem[]) => {
        return abi.filter( (item) => item.type ).map( (item: AbiItem) => {
            <li>
                <h3> {item.name} </h3>
                <p> tyep: {item.stateMutability} </p>
                <p> payable: {item.payable} </p>
                <p> {item.} </p>
            </li>
        })
    }
    
    return(
        <div>
            
        </div>
    )
}
