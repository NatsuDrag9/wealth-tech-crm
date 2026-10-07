package com.wealthtech.crm.modules.agent.framework;

import java.util.Map;

/**
 * Functional callback interface for framework tool invocation.
 */
@FunctionalInterface
public interface ToolCallback {

    /**
     * Executes the bound service method with arguments passed by the model.
     */
    Object call(Map<String, Object> arguments);
}
